const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// POST - Cadastro de eventos (apenas admin e secretary podem cadastrar)
router.post(
  "/events",
  authenticateToken,
  authorizeRole(["admin", "secretary"]),
  async (req, res) => {
    const { title, date, location, target_audience, artists } = req.body;

    if (!title || !date || !location) {
      return res
        .status(400)
        .json({ error: "Título, data e local são obrigatórios" });
    }

    try {
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        const [eventResult] = await connection.query(
          "INSERT INTO events (title, date, location, target_audience) VALUES (?, ?, ?, ?)",
          [title, date, location, target_audience || null]
        );
        const eventId = eventResult.insertId;

        if (artists && Array.isArray(artists) && artists.length > 0) {
          const artistValues = artists.map((artist) => [
            eventId,
            artist.artist_id,
            artist.amount || 0, // Quantia padrão como 0 se não fornecida
            artist.is_paid ? 1 : 0, // Converte booleano para 1 ou 0
          ]);
          await connection.query(
            "INSERT INTO event_artists (event_id, artist_id, amount, is_paid) VALUES ?",
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
  }
);

// GET - Listar todos os eventos (qualquer usuário autenticado pode ver)
router.get("/events", authenticateToken, async (req, res) => {
  try {
    const [events] = await db.query(`
      SELECT e.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'artist_id', ea.artist_id,
                 'artist_name', a.name,
                 'amount', ea.amount,
                 'is_paid', ea.is_paid
               )
             ) as artists
      FROM events e
      LEFT JOIN event_artists ea ON e.id = ea.event_id
      LEFT JOIN artists a ON ea.artist_id = a.id
      GROUP BY e.id
    `);
    // Parse do JSON para cada evento
    const parsedEvents = events.map((event) => ({
      ...event,
      artists: event.artists
        ? event.artists
            .split(",")
            .map((artist) => {
              try {
                return JSON.parse(artist);
              } catch {
                return null;
              }
            })
            .filter(Boolean)
        : [],
    }));
    res.status(200).json(parsedEvents);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
});

module.exports = router;
