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
            artist.artist_id, // Agora artist_id é o id do usuário (user_id)
            artist.amount || 0,
            artist.is_paid ? 1 : 0,
          ]);
          await connection.query(
            "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES ?",
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
    // Buscar todos os eventos
    const [events] = await db.query(`
      SELECT * FROM events
    `);
    console.log("Eventos:", events);

    // Para cada evento, buscar os artistas associados
    const eventsWithArtists = await Promise.all(
      events.map(async (event) => {
        console.log(`Buscando artistas para o evento ${event.id}`);
        const [artists] = await db.query(
          `
          SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid
          FROM event_artists ea
          LEFT JOIN users u ON ea.user_id = u.id
          WHERE ea.event_id = ?
        `,
          [event.id]
        );
        // Converter amount para número
        const parsedArtists = artists.map((artist) => ({
          ...artist,
          amount: Number(artist.amount), // Converter para número
        }));
        console.log(
          `Artistas encontrados para o evento ${event.id}:`,
          parsedArtists
        );
        return { ...event, artists: parsedArtists };
      })
    );

    console.log("Eventos com artistas:", eventsWithArtists);
    res.status(200).json(eventsWithArtists);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
});
module.exports = router;
