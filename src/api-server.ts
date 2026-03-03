import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

let stripeInstance: Stripe | null = null;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA || "";
  if (!stripeInstance && key) {
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
};

const app = express();

// Habilitar CORS
app.use(cors());

// Middleware para JSON (exceto para o webhook)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// API routes
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event;

  const stripe = getStripe();
  if (!stripe) return res.status(500).send("Stripe não configurado");

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_email;
    console.log(`Pagamento confirmado para: ${customerEmail}`);
  }

  res.json({ received: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor está rodando!" });
});

app.all("/api/create-checkout-session", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Método ${req.method} não permitido. Use POST.` });
  }

  const { email, priceId } = req.body;

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA;
    const stripePriceId = priceId || process.env.STRIPE_PRICE_ID || process.env.ID_DO_PRECO;

    console.log('>>> [SERVER] Stripe Key encontrada:', stripeKey ? 'SIM (termina em ' + stripeKey.slice(-4) + ')' : 'NÃO');
    console.log('>>> [SERVER] Price ID encontrado:', stripePriceId ? 'SIM (' + stripePriceId + ')' : 'NÃO');

    if (!stripeKey || !stripePriceId) {
      return res.status(500).json({ error: "Configuração do Stripe ausente no servidor." });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const origin = req.headers.origin || (host ? `${protocol}://${host}` : process.env.APP_URL) || "";

    if (!origin) {
      return res.status(400).json({ error: "Não foi possível determinar a origem da requisição para as URLs de retorno." });
    }

    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe não configurado no servidor.");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: email,
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro ao criar sessão do Stripe:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar checkout" });
  }
});

export default app;
