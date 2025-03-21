const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// GET - Listar usuários com papel "artist" (qualquer usuário autenticado pode ver)
router.get("/users/artists", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name FROM users WHERE role = "artist"'
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao listar usuários artistas:", error);
    res.status(500).json({ error: "Erro ao listar usuários artistas" });
  }
});

module.exports = router;
