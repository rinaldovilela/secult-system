const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// GET /api/notifications - Listar notificações do usuário logado
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [notifications] = await db.query(
      `
      SELECT id, type, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
      [req.user.id]
    );

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
    res.status(500).json({ error: "Erro ao listar notificações" });
  }
});

// PATCH /api/notifications/:id/read - Marcar uma notificação como lida
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a notificação existe e pertence ao usuário
    const [notifications] = await db.query(
      `
      SELECT * FROM notifications
      WHERE id = ? AND user_id = ?
    `,
      [id, req.user.id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ error: "Notificação não encontrada" });
    }

    // Atualizar o status para lida
    await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = ?
    `,
      [id]
    );

    res.status(200).json({ message: "Notificação marcada como lida" });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    res.status(500).json({ error: "Erro ao marcar notificação como lida" });
  }
});

module.exports = router;
