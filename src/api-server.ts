import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();

const logToFile = (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`); // Esto es seguro para Vercel
};

logToFile("Servidor api-server.ts carregado");

let stripeInstance: Stripe | null = null;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY || "";
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

app.get("/ping", (req, res) => {
  res.send("pong");
});

// API routes
app.get("/api/checkout", async (req, res) => {
  const stripe = getStripe();
  const stripePriceId = process.env.STRIPE_PRICE_ID;
  
  if (!stripe || !stripePriceId) {
    return res.status(500).send("Configuração do Stripe ausente no servidor.");
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const origin = process.env.APP_URL || (host ? `${protocol}://${host}` : "");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
    });

    res.redirect(303, session.url!);
  } catch (error: any) {
    res.status(500).send("Erro ao iniciar checkout: " + error.message);
  }
});

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
    const customerEmail = session.customer_email || session.customer_details?.email;
    logToFile(`PAGAMENTO CONFIRMADO: ${customerEmail} - Session: ${session.id}`);
    console.log(`>>> [WEBHOOK] Pagamento confirmado para: ${customerEmail}`);
    // Aqui você pode adicionar o código para atualizar o Supabase:
    // supabase.from('profiles').update({ is_premium: true }).eq('email', customerEmail)
  }

  res.json({ received: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor está rodando!" });
});

app.get("/api/weather", async (req, res) => {
  try {
    let ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "";
    
    // Normalize localhost or private IPs
    const isPrivate = !ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.");
    
    let lat = -22.7911; // Coordinates for Jaboticabal, SP
    let lon = -48.3244;
    let city = "Jaboticabal, SP";
    
    if (!isPrivate) {
      try {
        const ipRes = await fetch(`https://ipwho.is/${ip}`);
        const ipData = await ipRes.json();
        if (ipData && ipData.success) {
          lat = ipData.latitude;
          lon = ipData.longitude;
          city = `${ipData.city}, ${ipData.region_code || ipData.region || ""}`;
        } else {
          const ipRes2 = await fetch(`https://freeipapi.com/api/json/${ip}`);
          const ipData2 = await ipRes2.json();
          if (ipData2 && ipData2.cityName) {
            lat = ipData2.latitude;
            lon = ipData2.longitude;
            city = `${ipData2.cityName}, ${ipData2.regionName || ""}`;
          }
        }
      } catch (ipErr) {
        console.error("Server IP geolocator error:", ipErr);
      }
    } else {
      try {
        const ipRes = await fetch(`https://ipwho.is/`);
        const ipData = await ipRes.json();
        if (ipData && ipData.success) {
          lat = ipData.latitude;
          lon = ipData.longitude;
          city = `${ipData.city}, ${ipData.region_code || ipData.region || ""}`;
        }
      } catch (e) {
        console.error("Local IP geolocate fallback error:", e);
      }
    }

    // Call Open-Meteo API
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const weatherData = await weatherRes.json();
    
    if (weatherData && weatherData.current_weather) {
      const current = weatherData.current_weather;
      const code = current.weathercode;
      const isDay = current.is_day === 1;
      
      let condition = isDay ? 'Ensolarado' : 'Noite Limpa';
      
      if (code === 0) {
        condition = isDay ? 'Ensolarado' : 'Noite Limpa';
      } else if (code <= 3) {
        condition = isDay ? 'Parcialmente Nublado' : 'Noite com Nuvens';
      } else if (code === 45 || code === 48) {
        condition = 'Nevoeiro';
      } else if (code >= 51 && code <= 67) {
        condition = 'Chuvoso';
      } else if (code >= 71 && code <= 77) {
        condition = 'Nevando';
      } else if (code >= 80 && code <= 82) {
        condition = 'Pancadas de Chuva';
      } else if (code >= 85 && code <= 86) {
        condition = 'Pancadas de Neve';
      } else if (code >= 95) {
        condition = 'Tempestade';
      } else {
        condition = isDay ? 'Nublado' : 'Céu Encoberto';
      }

      return res.json({
        temp: Math.round(current.temperature),
        condition,
        location: city,
        loading: false,
        error: null
      });
    } else {
      throw new Error("Invalid response from Open-Meteo");
    }
  } catch (error: any) {
    console.error("Server weather error:", error);
    res.json({
      temp: 14,
      condition: "Noite Limpa",
      location: "Jaboticabal, SP",
      loading: false,
      error: null
    });
  }
});

app.get("/api/config-status", (req, res) => {
  res.json({
    stripe: {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPriceId: !!process.env.STRIPE_PRICE_ID,
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

    logToFile(`Iniciando checkout para email: ${email}`);
    
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = priceId || process.env.STRIPE_PRICE_ID;

    logToFile(`Stripe Key presente: ${!!stripeKey}, Price ID: ${stripePriceId}`);

    if (!stripeKey || !stripePriceId) {
      console.warn('>>> [SERVER] Configuração do Stripe ausente!');
      return res.status(500).json({ error: "Configuração do Stripe ausente no servidor." });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const origin = process.env.APP_URL || req.headers.origin || (host ? `${protocol}://${host}` : "");

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
      success_url: `${origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
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

app.get("/api/check-subscription", async (req, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: "Email é obrigatório" });

  // Developer Bypass
  if (email === "coffecoffe631@gmail.com") {
    return res.json({ isPremium: true });
  }

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe não configurado" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return res.json({ isPremium: false });
    }

    // Buscamos as assinaturas sem filtrar apenas por 'active' para saber se está 'past_due'
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.json({ isPremium: false });
    }

    const sub = subscriptions.data[0];
    const isPremium = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";

    res.json({ 
      isPremium,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end, // Unix timestamp do Stripe
      cancelAtPeriodEnd: sub.cancel_at_period_end
    });
  } catch (error: any) {
    console.error("Erro ao verificar assinatura:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/create-portal-session", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email é obrigatório" });

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: "Stripe não configurado" });

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado no Stripe." });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const origin = process.env.APP_URL || req.headers.origin || (host ? `${protocol}://${host}` : "");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: origin,
    });

    res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Erro ao criar sessão do portal:", error);
    res.status(500).json({ error: error.message });
  }
});

// Manipulador de erros global
app.use((err: any, req: any, res: any, next: any) => {
  console.error(">>> [SERVER FATAL ERROR]", err);
  res.status(500).json({ error: err.message || "Erro fatal no servidor" });
});

export default app;
