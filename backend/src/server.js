const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const db = require("./config/db");

const app = express();

// Log para todas as requisições
app.use((req, res, next) => {
  console.log(`[Server] Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

// Configuração do CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Middleware para tratar erros 404
app.use((req, res, next) => {
  console.log(`[Server] Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Rota não encontrada" });
});

// Middleware para tratar erros gerais
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Backend Secult System rodando!");
});
