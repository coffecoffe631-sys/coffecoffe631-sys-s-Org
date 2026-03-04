import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();

const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync("server.log", `[${timestamp}] ${message}\n`);
};

logToFile("Servidor api-server.ts carregado");

let stripeInstance: Stripe | null = null;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA || "";
  if (!stripeInstance && key) {
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
};

const app = express();

// Logger global para todas as requisições
app.use((req, res, next) => {
  const logMsg = `[REQUEST] ${req.method} ${req.url} - IP: ${req.ip}`;
  console.log(`>>> ${logMsg}`);
  logToFile(logMsg);
  next();
});

// Habilitar CORS
app.use(cors());

// Middleware para JSON (exceto para o webhook que precisa do corpo bruto)
app.use((req, res, next) => {
  if (req.path === "/api/webhook") {
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

app.get("/api/config-status", (req, res) => {
  res.json({
    stripe: {
      hasSecretKey: !!(process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA),
      hasPriceId: !!(process.env.STRIPE_PRICE_ID || process.env.ID_DO_PRECO),
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
    },
    env: process.env.NODE_ENV
  });
});

app.post("/api/create-checkout-session", async (req, res) => {
  logToFile(`Recebida requisição POST /api/create-checkout-session de ${req.ip}`);
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Método ${req.method} não permitido. Use POST.` });
  }

  const { email, priceId } = req.body;

  try {
    console.log('>>> [SERVER] Recebida requisição para create-checkout-session');
    console.log('>>> [SERVER] Body:', req.body);
    console.log('>>> [SERVER] Env Keys:', Object.keys(process.env).filter(k => k.includes('STRIPE') || k.includes('CHAVE') || k.includes('ID')));

    logToFile(`Iniciando checkout para email: ${email}`);
    
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.CHAVE_SECRETA;
    const stripePriceId = priceId || process.env.STRIPE_PRICE_ID || process.env.ID_DO_PRECO;

    logToFile(`Stripe Key presente: ${!!stripeKey}, Price ID: ${stripePriceId}`);

    console.log('>>> [SERVER] Stripe Key encontrada:', stripeKey ? 'SIM (termina em ' + stripeKey.slice(-4) + ')' : 'NÃO');
    console.log('>>> [SERVER] Price ID encontrado:', stripePriceId ? 'SIM (' + stripePriceId + ')' : 'NÃO');

    if (!stripeKey || !stripePriceId) {
      console.warn('>>> [SERVER] Configuração do Stripe ausente!');
      return res.status(500).json({ error: "Configuração do Stripe ausente no servidor." });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const origin = req.headers.origin || (host ? `${protocol}://${host}` : process.env.APP_URL) || "";

    console.log('>>> [SERVER] Origin determinada:', origin);

    if (!origin) {
      console.warn('>>> [SERVER] Não foi possível determinar a origem!');
      return res.status(400).json({ error: "Não foi possível determinar a origem da requisição para as URLs de retorno." });
    }

    const stripe = getStripe();
    if (!stripe) {
      console.error('>>> [SERVER] Falha ao inicializar instância do Stripe! Verifique a chave.');
      return res.status(500).json({ error: "Stripe não configurado no servidor. Verifique as chaves de API." });
    }

    console.log('>>> [SERVER] Criando sessão no Stripe...');
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

    logToFile(`Sessão criada: ${session.id}`);
    res.json({ url: session.url });
  } catch (error: any) {
    logToFile(`ERRO no checkout: ${error.message}`);
    console.error(">>> [SERVER] Erro ao criar sessão do Stripe:", error);
    res.status(500).json({ 
      error: error.message || "Erro interno ao processar checkout",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Manipulador de erros global
app.use((err: any, req: any, res: any, next: any) => {
  console.error(">>> [SERVER FATAL ERROR]", err);
  res.status(500).json({ error: err.message || "Erro fatal no servidor" });
});

export default app;
