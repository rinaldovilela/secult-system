const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/artists - Listar todos os artistas
router.get("/", authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [artists] = await db.query(
      "SELECT id, name FROM users WHERE role = 'artist'"
    );

    res.status(200).json(artists);
  } catch (error) {
    console.error("Erro ao listar artistas:", error);
    res.status(500).json({ error: "Erro ao listar artistas" });
  }
});

module.exports = router;
