import app from "./src/api-server";
import { createServer as createViteServer } from "vite";
import express from "express";

const PORT = 3000;

console.log('>>> [SERVER] Inicializando servidor...');

async function startServer() {
  console.log('>>> [SERVER] Configurando middleware do Vite...');
  // Vite middleware para desenvolvimento no AI Studio
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  try {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> [SERVER] Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (listenError) {
    console.error(">>> [SERVER] Erro ao iniciar listen:", listenError);
  }
}

startServer().catch(err => {
  console.error(">>> [SERVER] Erro fatal na inicialização:", err);
});

