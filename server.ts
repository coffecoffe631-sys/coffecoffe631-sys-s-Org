import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

console.log(">>> SERVIDOR EXPRESS INICIANDO...");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const app = express();
const PORT = 3000;

// Logger de requisições
app.use((req, res, next) => {
  console.log(`>>> [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes FIRST
// Importante: O webhook do Stripe precisa do corpo bruto (raw body) para verificar a assinatura.
// Por isso, definimos ele ANTES do express.json().
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event;

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

// Agora usamos express.json() para as outras rotas
app.use(express.json());

// Rota de teste para verificar se o servidor está respondendo
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor está rodando!" });
});

// Rota genérica para capturar qualquer requisição /api/ que não tenha sido tratada
app.all("/api/*", (req, res, next) => {
  console.log(`>>> [API CATCH-ALL] ${req.method} ${req.url}`);
  // Se for um método que não tratamos, podemos retornar uma mensagem melhor
  if (req.method !== "POST" && req.url.includes("create-checkout-session")) {
    return res.status(405).json({ error: `Método ${req.method} não permitido para esta rota. Use POST.` });
  }
  next();
});

// Endpoint para criar a sessão de checkout do Stripe
app.post(["/api/create-checkout-session", "/api/create-checkout-session/"], async (req, res) => {
  const { email, priceId } = req.body;

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = priceId || process.env.STRIPE_PRICE_ID;

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY não configurada");
      return res.status(500).json({ error: "Configuração do Stripe ausente no servidor (chave secreta)." });
    }

    if (!stripePriceId) {
      console.error("STRIPE_PRICE_ID não configurada");
      return res.status(500).json({ error: "Configuração do Stripe ausente no servidor (ID do preço)." });
    }

    if (stripePriceId.startsWith('prod_')) {
      console.error("Erro: Foi fornecido um Product ID (prod_...) em vez de um Price ID (price_...)");
      return res.status(400).json({ 
        error: "Você forneceu um Product ID (prod_...). No Stripe Checkout, você deve usar o Price ID (price_...). Procure no Dashboard do Stripe pelo ID que começa com 'price_' dentro do seu produto." 
      });
    }

    // Fallback para origin se não estiver presente nos headers
    const origin = req.headers.origin || process.env.APP_URL || `http://localhost:${PORT}`;

    console.log(`Iniciando checkout para ${email} com preço ${stripePriceId} em ${origin}`);

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

    if (!session.url) {
      throw new Error("Sessão do Stripe criada sem URL de redirecionamento.");
    }

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro ao criar sessão do Stripe:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar checkout" });
  }
});

// Vite middleware para desenvolvimento
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
