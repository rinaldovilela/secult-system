const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const cpfCnpjValidator = require("cpf-cnpj-validator"); // Para validação de CPF/CNPJ
const { cpf, cnpj } = cpfCnpjValidator;

const router = express.Router();

// Registro de usuário (admin ou secretary)
const { v1: uuidv1 } = require("uuid");

router.post("/register", authenticateToken, async (req, res) => {
  const { name, email, password, role, cpf_cnpj } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  if (!["admin", "secretary", "artist", "organizer"].includes(role)) {
    return res.status(400).json({ error: "Role inválido" });
  }

  if (role === "admin" && req.user.role !== "admin") {
    return res.status(403).json({
      error: "Apenas administradores podem registrar outros administradores",
    });
  }

  if (cpf_cnpj && !cpf.isValid(cpf_cnpj) && !cnpj.isValid(cpf_cnpj)) {
    return res.status(400).json({ error: "CPF ou CNPJ inválido" });
  }

  try {
    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email já registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv1(); // Gera um UUID para o novo usuário
    await db.query(
      "INSERT INTO users (id, name, email, password, role, cpf_cnpj, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [userId, name, email, hashedPassword, role, cpf_cnpj || null]
    );

    res.status(201).json({ id: userId, name, email, role });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id, // Agora é uma string (UUID)
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

module.exports = router;
