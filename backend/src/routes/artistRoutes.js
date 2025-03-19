const express = require("express");
const db = require("../config/db");

const router = express.Router();

// POST - Cadastro de artistas
router.post("/artists", async (req, res) => {
  const { name, email, bio, portfolioUrl } = req.body;

  // Validação básica
  if (!name || !email) {
    return res.status(400).json({ error: "Nome e email são obrigatórios" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO artists (name, email, bio, portfolio_url) VALUES (?, ?, ?, ?)",
      [name, email, bio || null, portfolioUrl || null]
    );
    res.status(201).json({ id: result.insertId, name, email });
  } catch (error) {
    console.error("Erro ao cadastrar artista:", error);
    res.status(500).json({ error: "Erro ao cadastrar artista" });
  }
});

// GET - Listar todos os artistas
router.get("/artists", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM artists");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao listar artistas:", error);
    res.status(500).json({ error: "Erro ao listar artistas" });
  }
});

module.exports = router;
