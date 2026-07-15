import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const logToFile = (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
};

logToFile("Servidor api-server.ts carregado");

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

// Middleware para JSON
app.use(express.json());

app.get("/ping", (req, res) => {
  res.send("pong");
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

// Manipulador de erros global
app.use((err: any, req: any, res: any, next: any) => {
  console.error(">>> [SERVER FATAL ERROR]", err);
  res.status(500).json({ error: err.message || "Erro fatal no servidor" });
});

export default app;
