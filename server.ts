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
    // Logger para depuração de rotas
    app.use((req, res, next) => {
      if (req.url === '/' || req.url.startsWith('/?')) {
        logToFile(`[ROOT_CHECK] Request para ROOT: ${req.method} ${req.url}`);
      }
      next();
    });

    const isProd = process.env.NODE_ENV === "production";
    logToFile(`Modo: ${isProd ? 'Produção' : 'Desenvolvimento'} (NODE_ENV=${process.env.NODE_ENV})`);

    if (!isProd) {
      logToFile("Iniciando Vite em modo middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      logToFile("Middleware do Vite configurado.");
    } else {
      logToFile("Modo produção, servindo dist...");
      app.use(express.static("dist"));
      
      // SPA Fallback para produção - Garante que o root funcione
      app.get("*", (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        const indexPath = path.join(process.cwd(), "dist", "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          logToFile(`ERRO: dist/index.html não encontrado!`);
          res.status(404).send("Aplicação não encontrada. Por favor, execute o build.");
        }
      });
    }

    // Iniciar o servidor Express
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

