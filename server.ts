import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const app = express();
const PORT = 3000;

// API routes FIRST
app.use(express.json());

// Endpoint para criar a sessão de checkout do Stripe
app.post("/api/create-checkout-session", async (req, res) => {
  const { email, priceId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId || process.env.STRIPE_PRICE_ID, // ID do preço do plano mensal no Stripe
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: email,
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro ao criar sessão do Stripe:", error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook para receber confirmação de pagamento do Stripe
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
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Lógica para atualizar o status do usuário no banco de dados (Supabase)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_email;
    console.log(`Pagamento confirmado para: ${customerEmail}`);
    // Aqui você faria uma chamada ao Supabase para marcar o usuário como "Premium"
  }

  res.json({ received: true });
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
