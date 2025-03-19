const express = require("express");
const db = require("../config/db");

const router = express.Router();

// POST - Cadastro de eventos
router.post("/events", async (req, res) => {
  const { title, date, location, target_audience, artist_ids } = req.body;

  if (!title || !date || !location) {
    return res
      .status(400)
      .json({ error: "Título, data e local são obrigatórios" });
  }

  try {
    // Iniciar transação para garantir consistência
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Inserir o evento
      const [eventResult] = await connection.query(
        "INSERT INTO events (title, date, location, target_audience) VALUES (?, ?, ?, ?)",
        [title, date, location, target_audience || null]
      );
      const eventId = eventResult.insertId;

      // Associar artistas ao evento (se houver)
      if (artist_ids && Array.isArray(artist_ids) && artist_ids.length > 0) {
        const artistValues = artist_ids.map((artistId) => [eventId, artistId]);
        await connection.query(
          "INSERT INTO event_artists (event_id, artist_id) VALUES ?",
          [artistValues]
        );
      }

      await connection.commit();
      res.status(201).json({ id: eventId, title, date, location });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erro ao cadastrar evento:", error);
    res
      .status(500)
      .json({ error: "Erro ao cadastrar evento", details: error.message });
  }
});

// GET - Listar todos os eventos com artistas associados
router.get("/events", async (req, res) => {
  try {
    const [events] = await db.query(`
      SELECT e.*, GROUP_CONCAT(a.name) as artist_names
      FROM events e
      LEFT JOIN event_artists ea ON e.id = ea.event_id
      LEFT JOIN artists a ON ea.artist_id = a.id
      GROUP BY e.id
    `);
    res.status(200).json(events);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
});

module.exports = router;
