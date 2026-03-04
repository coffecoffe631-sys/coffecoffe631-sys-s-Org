import app from "./src/api-server";
import { createServer as createViteServer } from "vite";
import express from "express";
import fs from "fs";
import path from "path";

const PORT = 3000;
const logPath = path.join(process.cwd(), "server.log");

const logToFile = (message: string) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] [SERVER.TS] ${message}\n`);
};

logToFile("Iniciando server.ts");

async function startServer() {
  logToFile("Chamando startServer()");
  console.log('>>> [SERVER] Inicializando servidor...');

  // Iniciar o servidor Express
  try {
    // Vite middleware para desenvolvimento no AI Studio
    const isProd = process.env.NODE_ENV === "production";
    logToFile(`Modo: ${isProd ? 'Produção' : 'Desenvolvimento'} (NODE_ENV=${process.env.NODE_ENV})`);

    if (!isProd) {
      logToFile("Iniciando Vite em modo middleware...");
      console.log('>>> [SERVER] Iniciando Vite em modo middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      logToFile("Vite criado, montando middlewares...");
      app.use(vite.middlewares);
      logToFile("Middleware do Vite configurado com sucesso.");
      console.log('>>> [SERVER] Middleware do Vite configurado com sucesso.');
    } else {
      logToFile("Modo produção, servindo dist...");
      console.log('>>> [SERVER] Servindo arquivos estáticos da pasta dist...');
      app.use(express.static("dist"));
      
      // SPA Fallback para produção
      app.get("*", (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      });
    }

    // Iniciar o servidor Express APÓS configurar middlewares
    logToFile(`Iniciando listen na porta ${PORT}...`);
    app.listen(PORT, "0.0.0.0", () => {
      logToFile(`Servidor rodando na porta ${PORT}`);
      console.log(`>>> [SERVER] Servidor rodando em http://localhost:${PORT}`);
    });

  } catch (error: any) {
    logToFile(`ERRO na inicialização: ${error.message}`);
    console.error('>>> [SERVER] Erro na inicialização:', error);
  }
}

startServer().catch(err => {
  console.error(">>> [SERVER] Erro fatal na inicialização:", err);
});

