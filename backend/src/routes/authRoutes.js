const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const cpfCnpjValidator = require("cpf-cnpj-validator");
const { cpf, cnpj } = cpfCnpjValidator;

const router = express.Router();

// In-memory storage for login attempts (not persistent across restarts)
const loginAttempts = new Map();

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
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email já registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv1();
    await db.query(
      "INSERT INTO users (id, name, email, password, role, cpf_cnpj, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [userId, name, email, hashedPassword, role, cpf_cnpj || null]
    );

    res.status(201).json({ id: userId, name, email, role });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res
      .status(500)
      .json({ error: "Erro interno do servidor ao registrar usuário" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  // In-memory rate limiting: 5 attempts per email in 15 minutes
  const maxAttempts = 5;
  const windowMs = 1 * 60 * 1000; // 15 minutes in milliseconds
  const now = Date.now();

  let attemptsData = loginAttempts.get(email) || { count: 0, startTime: now };

  // Reset attempts if the window has expired
  if (now - attemptsData.startTime > windowMs) {
    attemptsData = { count: 0, startTime: now };
  }

  if (attemptsData.count >= maxAttempts) {
    return res.status(429).json({
      error: "Muitas tentativas. Tente novamente em 1 minuto.",
    });
  }

  try {
    const [users] = await db.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ?",
      [email]
    );
    if (users.length === 0) {
      // Increment attempts
      attemptsData.count += 1;
      loginAttempts.set(email, attemptsData);
      return res.status(404).json({ error: "E-mail não cadastrado" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment attempts
      attemptsData.count += 1;
      loginAttempts.set(email, attemptsData);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    // Reset attempts on successful login
    loginAttempts.delete(email);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro interno do servidor ao fazer login" });
  }
});

module.exports = router;
