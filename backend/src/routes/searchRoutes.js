const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// GET /api/search - Buscar eventos e usuários
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { type, query } = req.query;

    let results = [];

    if (type === "all" || type === "events") {
      const [events] = await db.query(
        `
        SELECT id, title, date
        FROM events
        WHERE title LIKE ? OR date LIKE ?
        `,
        [`%${query}%`, `%${query}%`]
      );
      console.log("Eventos brutos retornados do banco:", events); // Depuração: dados brutos

      const mappedEvents = events.map((event) => ({
        type: "event",
        id: event.id,
        title: event.title,
        date: event.date,
      }));
      console.log("Eventos mapeados:", mappedEvents); // Depuração: dados mapeados

      results.push(...mappedEvents);
    }

    // Buscar usuários (artistas e grupos)
    if (type === "all" || type === "users") {
      const [users] = await db.query(
        `
        SELECT id, name, email, role
        FROM users
        WHERE (name LIKE ? OR email LIKE ?) AND role IN ('artist', 'group')
        `,
        [`%${query}%`, `%${query}%`]
      );
      results.push(
        ...users.map((user) => ({
          type: "user",
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }))
      );
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao buscar:", error);
    res.status(500).json({ error: "Erro ao buscar" });
  }
});

module.exports = router;
