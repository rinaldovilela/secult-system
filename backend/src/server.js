// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const eventRoutes = require("./routes/eventRoutes");
const artistRoutes = require("./routes/artistRoutes");
const searchRoutes = require("./routes/searchRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const db = require("./config/db");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Log para todas as requisições
app.use((req, res, next) => {
  console.log(`[Server] Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

// Configuração do CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/api", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);

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

// Configuração do Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log("[WebSocket] Token não fornecido");
    return next(new Error("Token não fornecido"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    console.log(`[WebSocket] Token autenticado para usuário ${decoded.id}`);
    next();
  } catch (error) {
    console.error("[WebSocket] Erro ao autenticar token:", error);
    next(new Error("Token inválido"));
  }
});

io.on("connection", (socket) => {
  console.log(`[WebSocket] Usuário conectado: ${socket.user.id}`);
  socket.join(socket.user.id.toString()); // Garantir que o ID seja uma string

  socket.on("disconnect", () => {
    console.log(`[WebSocket] Usuário desconectado: ${socket.user.id}`);
  });
});

// Tornar o io acessível para as rotas
app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Backend Secult System rodando!");
});
