import app from "./src/api-server";
import { createServer as createViteServer } from "vite";
import express from "express";

const PORT = 3000;

async function startServer() {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();

