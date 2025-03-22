const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// Função auxiliar para criar uma notificação e emitir evento WebSocket
const createNotification = async (req, userId, type, message) => {
  try {
    const [result] = await db.query(
      `
      INSERT INTO notifications (user_id, type, message, is_read, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `,
      [userId, type, message, false]
    );

    const notification = {
      id: result.insertId,
      user_id: userId,
      type,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Emitir evento WebSocket para o usuário específico
    const io = req.app.get("io");
    io.to(userId.toString()).emit("new_notification", notification);
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
  }
};

// POST /api/events - Cadastro de eventos (apenas admin e secretary podem cadastrar)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description, date, location, target_audience, artists } =
      req.body;

    // Validar os dados
    if (!title || !date || !location || !target_audience) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Converter a data para o formato MySQL
    let formattedDate;
    try {
      formattedDate = new Date(date)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    } catch (error) {
      return res.status(400).json({ error: "Formato de data inválido" });
    }

    // Inserir o evento
    const [result] = await db.query(
      `
      INSERT INTO events (title, description, date, location, target_audience, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
      [title, description || null, formattedDate, location, target_audience]
    );

    const eventId = result.insertId;

    // Adicionar os artistas ao evento e criar notificações
    if (artists && artists.length > 0) {
      for (const artist of artists) {
        const { artist_id, amount } = artist;
        await db.query(
          "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?)",
          [eventId, artist_id, amount, false]
        );

        // Criar notificação para o artista
        await createNotification(
          req,
          artist_id,
          "new_event",
          `Você foi adicionado ao evento '${title}' agendado para ${new Date(date).toLocaleDateString()}.`
        );
      }
    }

    res.status(201).json({ message: "Evento criado com sucesso", eventId });
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    res.status(500).json({ error: "Erro ao criar evento" });
  }
});

// GET /api/events - Listar todos os eventos (qualquer usuário autenticado pode ver)
router.get("/", authenticateToken, async (req, res) => {
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

// GET /api/events/:id
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar o evento
    const [events] = await db.query(
      `
      SELECT e.*
      FROM events e
      WHERE e.id = ?
    `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const event = events[0];

    // Buscar os artistas associados
    const [artists] = await db.query(
      `
      SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid
      FROM event_artists ea
      LEFT JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = ?
    `,
      [id]
    );

    // Converter amount para número
    const parsedArtists = artists.map((artist) => ({
      ...artist,
      amount: Number(artist.amount),
    }));

    res.status(200).json({ ...event, artists: parsedArtists });
  } catch (error) {
    console.error("Erro ao buscar evento:", error);
    res.status(500).json({ error: "Erro ao buscar evento" });
  }
});

// PUT /api/events/:id
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, target_audience } = req.body;

    // Validar os dados
    if (!title || !date || !location || !target_audience) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Converter a data para o formato MySQL (ex.: "2025-03-21 00:00:00")
    let formattedDate;
    try {
      formattedDate = new Date(date)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    } catch (error) {
      return res.status(400).json({ error: "Formato de data inválido" });
    }

    // Atualizar o evento
    const [result] = await db.query(
      `
      UPDATE events
      SET title = ?, description = ?, date = ?, location = ?, target_audience = ?
      WHERE id = ?
    `,
      [title, description || null, formattedDate, location, target_audience, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    res.status(200).json({ message: "Evento atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    res.status(500).json({ error: "Erro ao atualizar evento" });
  }
});

// POST /api/events/:id/artists - Adicionar um artista a um evento
router.post("/:id/artists", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { artist_id, amount } = req.body;

    // Validar os dados
    if (!artist_id || !amount) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Verificar se o evento existe
    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const event = events[0];

    // Verificar se o artista existe
    const [artists] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = 'artist'",
      [artist_id]
    );
    if (artists.length === 0) {
      return res.status(404).json({ error: "Artista não encontrado" });
    }

    // Verificar se o artista já está associado ao evento
    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artist_id]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Artista já está associado ao evento" });
    }

    // Adicionar o artista ao evento
    await db.query(
      "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?)",
      [id, artist_id, amount, false]
    );

    // Criar notificação para o artista
    await createNotification(
      req,
      artist_id,
      "new_event",
      `Você foi adicionado ao evento '${event.title}' agendado para ${new Date(event.date).toLocaleDateString()}.`
    );

    res
      .status(201)
      .json({ message: "Artista adicionado ao evento com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar artista ao evento:", error);
    res.status(500).json({ error: "Erro ao adicionar artista ao evento" });
  }
});

// DELETE /api/events/:id/artists/:artistId - Remover um artista de um evento
router.delete("/:id/artists/:artistId", authenticateToken, async (req, res) => {
  try {
    const { id, artistId } = req.params;

    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Verificar se o evento existe
    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    // Verificar se o artista está associado ao evento
    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ error: "Artista não encontrado no evento" });
    }

    // Remover o artista do evento
    await db.query(
      "DELETE FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );

    res.status(200).json({ message: "Artista removido do evento com sucesso" });
  } catch (error) {
    console.error("Erro ao remover artista do evento:", error);
    res.status(500).json({ error: "Erro ao remover artista do evento" });
  }
});

// PATCH /api/events/:id/artists/:artistId - Atualizar o status de pagamento de um artista
router.patch("/:id/artists/:artistId", authenticateToken, async (req, res) => {
  try {
    const { id, artistId } = req.params;
    const { is_paid } = req.body;

    // Validar os dados
    if (typeof is_paid !== "boolean") {
      return res
        .status(400)
        .json({ error: "O campo is_paid deve ser um booleano" });
    }

    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Verificar se o evento existe
    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const event = events[0];

    // Verificar se o artista está associado ao evento
    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ error: "Artista não encontrado no evento" });
    }

    // Atualizar o status de pagamento
    await db.query(
      "UPDATE event_artists SET is_paid = ? WHERE event_id = ? AND user_id = ?",
      [is_paid, id, artistId]
    );

    // Criar notificação para o artista
    await createNotification(
      req,
      artistId,
      "payment_status_updated",
      `O status de pagamento do evento '${event.title}' foi atualizado para ${is_paid ? "Pago" : "Pendente"}.`
    );

    res
      .status(200)
      .json({ message: "Status de pagamento atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar status de pagamento:", error);
    res.status(500).json({ error: "Erro ao atualizar status de pagamento" });
  }
});

// GET /api/events/details/:id - Buscar detalhes completos de um evento (apenas admin ou secretary)
router.get("/details/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário tem permissão (admin ou secretary)
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [events] = await db.query(
      `
      SELECT id, title, date, description, location, created_at
      FROM events
      WHERE id = ?
    `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    res.status(200).json(events[0]);
  } catch (error) {
    console.error("Erro ao buscar detalhes do evento:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do evento" });
  }
});

module.exports = router;
