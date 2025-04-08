const express = require("express");
const { v4: uuidv4 } = require("uuid"); // Importar a função v4 para gerar UUIDs
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const multer = require("multer");

const router = express.Router();

// Configuração do Multer para armazenar arquivos em memória (iremos salvar no banco de dados)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB por arquivo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "video/mp4",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido"), false);
    }
  },
});

// Função auxiliar para validar UUID
const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Função auxiliar para criar uma notificação e emitir evento WebSocket
const createNotification = async (req, userId, type, message) => {
  try {
    // Validar se o userId é um UUID válido
    if (!isValidUUID(userId)) {
      console.error(`[createNotification] userId inválido: ${userId}`);
      return;
    }

    console.log(
      `[createNotification] Criando notificação para userId: ${userId}, tipo: ${type}`
    );

    // Gerar um UUID para o campo id
    const notificationId = uuidv4();

    // Inserir a notificação com o id gerado
    await db.query(
      `
      INSERT INTO notifications (id, user_id, type, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `,
      [notificationId, userId, type, message, false]
    );

    const notification = {
      id: notificationId, // Usar o UUID gerado
      user_id: userId,
      type,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const io = req.app.get("io");
    if (!io) {
      console.error(
        "[createNotification] Erro: io não está definido no req.app"
      );
      return;
    }

    console.log(
      `[createNotification] Emitindo notificação para userId: ${userId}`,
      notification
    );
    io.to(userId.toString()).emit("new_notification", notification);
  } catch (error) {
    console.error(
      `[createNotification] Erro ao criar notificação para userId: ${userId}`,
      error
    );
  }
};

// POST /api/events - Cadastro de eventos (apenas admin e secretary podem cadastrar)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description, date, location, target_audience, artists } =
      req.body;

    if (!title || !date || !location || !target_audience) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    let formattedDate;
    try {
      formattedDate = new Date(date)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    } catch (error) {
      return res.status(400).json({ error: "Formato de data inválido" });
    }

    const eventId = uuidv4();

    await db.query(
      `
      INSERT INTO events (id, title, description, date, location, target_audience, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        eventId,
        title,
        description || null,
        formattedDate,
        location,
        target_audience,
      ]
    );

    if (artists && artists.length > 0) {
      for (const artist of artists) {
        const { artist_id, amount } = artist;

        if (!isValidUUID(artist_id)) {
          return res
            .status(400)
            .json({ error: `artist_id inválido: ${artist_id}` });
        }

        await db.query(
          "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?)",
          [eventId, artist_id, amount, false]
        );

        await createNotification(
          req,
          artist_id,
          "new_event",
          `Você foi adicionado ao evento '${title}' agendado para ${new Date(
            date
          ).toLocaleDateString()}.`
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
    const [events] = await db.query(`
      SELECT * FROM events
    `);

    const eventsWithArtists = await Promise.all(
      events.map(async (event) => {
        const [artists] = await db.query(
          `
          SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid, ea.payment_proof_mime_type
          FROM event_artists ea
          LEFT JOIN users u ON ea.user_id = u.id
          WHERE ea.event_id = ?
        `,
          [event.id]
        );

        const parsedArtists = artists.map((artist) => ({
          ...artist,
          amount: Number(artist.amount),
          payment_proof_url: artist.payment_proof_mime_type
            ? `/api/files/event_artists/${event.id}/${artist.artist_id}/payment_proof`
            : null,
        }));

        return { ...event, artists: parsedArtists };
      })
    );

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

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }

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

    const [artists] = await db.query(
      `
      SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid, ea.payment_proof_mime_type
      FROM event_artists ea
      LEFT JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = ?
    `,
      [id]
    );

    const parsedArtists = artists.map((artist) => ({
      ...artist,
      amount: Number(artist.amount),
      payment_proof_url: artist.payment_proof_mime_type
        ? `/api/files/event_artists/${id}/${artist.artist_id}/payment_proof`
        : null,
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

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }

    if (!title || !date || !location || !target_audience) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    let formattedDate;
    try {
      formattedDate = new Date(date)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    } catch (error) {
      return res.status(400).json({ error: "Formato de data inválido" });
    }

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

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }
    if (!isValidUUID(artist_id)) {
      return res
        .status(400)
        .json({ error: `artist_id inválido: ${artist_id}` });
    }

    if (!artist_id || !amount) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const event = events[0];

    const [artists] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role IN ('artist', 'group')",
      [artist_id]
    );
    if (artists.length === 0) {
      return res.status(404).json({ error: "Artista ou grupo não encontrado" });
    }

    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artist_id]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Artista ou grupo já está associado ao evento" });
    }

    await db.query(
      "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?)",
      [id, artist_id, amount, false]
    );

    console.log(
      `[POST /events/:id/artists] Gerando notificação para artistId: ${artist_id}`
    );
    await createNotification(
      req,
      artist_id,
      "artist_added",
      `Você foi adicionado ao evento '${event.title}' agendado para ${new Date(
        event.date
      ).toLocaleDateString("pt-BR")}.`
    );

    res
      .status(201)
      .json({ message: "Artista ou grupo adicionado ao evento com sucesso" });
  } catch (error) {
    console.error(
      "[POST /events/:id/artists] Erro ao adicionar artista ao evento:",
      error
    );
    res.status(500).json({ error: "Erro ao adicionar artista ao evento" });
  }
});

// DELETE /api/events/:id/artists/:artistId - Remover um artista de um evento
router.delete("/:id/artists/:artistId", authenticateToken, async (req, res) => {
  try {
    const { id, artistId } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }
    if (!isValidUUID(artistId)) {
      return res.status(400).json({ error: `artistId inválido: ${artistId}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const event = events[0];

    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ error: "Artista ou grupo não encontrado no evento" });
    }

    await db.query(
      "DELETE FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );

    console.log(
      `[DELETE /events/:id/artists/:artistId] Gerando notificação para artistId: ${artistId}`
    );
    await createNotification(
      req,
      artistId,
      "artist_removed",
      `Você foi removido do evento '${event.title}' agendado para ${new Date(
        event.date
      ).toLocaleDateString("pt-BR")}.`
    );

    res
      .status(200)
      .json({ message: "Artista ou grupo removido do evento com sucesso" });
  } catch (error) {
    console.error(
      "[DELETE /events/:id/artists/:artistId] Erro ao remover artista do evento:",
      error
    );
    res.status(500).json({ error: "Erro ao remover artista do evento" });
  }
});

// PATCH /api/events/:id/artists/:artistId - Atualizar o status de pagamento de um artista
router.patch(
  "/:id/artists/:artistId",
  authenticateToken,
  upload.single("payment_proof"),
  async (req, res) => {
    try {
      const { id, artistId } = req.params;
      const { is_paid, amount } = req.body; // is_paid será uma string ("true" ou "false")
      const paymentProof = req.file;

      if (!isValidUUID(id)) {
        return res.status(400).json({ error: `id inválido: ${id}` });
      }
      if (!isValidUUID(artistId)) {
        return res
          .status(400)
          .json({ error: `artistId inválido: ${artistId}` });
      }

      // Converter is_paid de string para booleano
      let parsedIsPaid;
      if (is_paid !== undefined) {
        if (is_paid === "true") {
          parsedIsPaid = true;
        } else if (is_paid === "false") {
          parsedIsPaid = false;
        } else {
          return res
            .status(400)
            .json({ error: "O campo is_paid deve ser 'true' ou 'false'" });
        }
      }

      if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
        return res
          .status(400)
          .json({ error: "O campo amount deve ser um número positivo" });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const [events] = await db.query("SELECT * FROM events WHERE id = ?", [
        id,
      ]);
      if (events.length === 0) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      const event = events[0];

      const [existing] = await db.query(
        "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
        [id, artistId]
      );
      if (existing.length === 0) {
        return res
          .status(404)
          .json({ error: "Artista ou grupo não encontrado no evento" });
      }

      const updates = {};
      if (parsedIsPaid !== undefined) updates.is_paid = parsedIsPaid;
      if (amount !== undefined) updates.amount = amount;

      // Comprovante de pagamento é opcional, só atualiza se o arquivo for enviado
      if (paymentProof) {
        updates.payment_proof = paymentProof.buffer;
        updates.payment_proof_mime_type = paymentProof.mimetype;
      } else if (parsedIsPaid === false) {
        // Se marcar como "pendente", remove o comprovante (se existir)
        updates.payment_proof = null;
        updates.payment_proof_mime_type = null;
      }

      const fields = Object.keys(updates);
      if (fields.length === 0) {
        return res.status(400).json({ error: "Nenhum campo para atualizar" });
      }

      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((field) => updates[field]);

      await db.query(
        `UPDATE event_artists SET ${setClause} WHERE event_id = ? AND user_id = ?`,
        [...values, id, artistId]
      );

      console.log(
        `[PATCH /events/:id/artists/:artistId] Gerando notificação para artistId: ${artistId}`
      );
      if (parsedIsPaid !== undefined) {
        await createNotification(
          req,
          artistId,
          "payment_status_updated",
          `O status de pagamento do evento '${event.title}' foi atualizado para ${
            parsedIsPaid ? "Pago" : "Pendente"
          }.`
        );
      }

      res.status(200).json({ message: "Artista atualizado com sucesso" });
    } catch (error) {
      console.error(
        "[PATCH /events/:id/artists/:artistId] Erro ao atualizar artista:",
        error
      );
      res.status(500).json({ error: "Erro ao atualizar artista" });
    }
  }
);
// GET /api/events/details/:id - Buscar detalhes completos de um evento (apenas admin ou secretary)
// GET /api/events/details/:id - Buscar detalhes completos de um evento (apenas admin ou secretary)
router.get("/details/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validar se o id é um UUID válido
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }

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

    const event = events[0];

    // Buscar os artistas associados ao evento
    const [artists] = await db.query(
      `
      SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid, ea.payment_proof_mime_type
      FROM event_artists ea
      LEFT JOIN users u ON ea.user_id = u.id
      WHERE ea.event_id = ?
    `,
      [id]
    );

    const parsedArtists = artists.map((artist) => ({
      artist_id: artist.artist_id,
      artist_name: artist.artist_name,
      amount: Number(artist.amount),
      is_paid: Boolean(artist.is_paid),
      payment_proof_url: artist.payment_proof_mime_type
        ? `/api/files/event_artists/${id}/${artist.artist_id}/payment_proof`
        : null,
    }));

    res.status(200).json({ ...event, artists: parsedArtists });
  } catch (error) {
    console.error("Erro ao buscar detalhes do evento:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do evento" });
  }
});

router.post(
  "/:id/reports",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { file_type, description } = req.body;
      const file = req.file;

      if (!isValidUUID(id)) {
        return res.status(400).json({ error: `id inválido: ${id}` });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!file || !file_type) {
        return res
          .status(400)
          .json({ error: "Arquivo e tipo de arquivo são obrigatórios" });
      }

      if (!["photo", "video", "document"].includes(file_type)) {
        return res.status(400).json({ error: "Tipo de arquivo inválido" });
      }

      const [events] = await db.query("SELECT * FROM events WHERE id = ?", [
        id,
      ]);
      if (events.length === 0) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      const reportId = uuidv4();

      await db.query(
        `
        INSERT INTO event_reports (id, event_id, file_data, file_type, description, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `,
        [reportId, id, file.buffer, file_type, description || null]
      );

      res.status(201).json({ message: "Relatório adicionado com sucesso" });
    } catch (error) {
      console.error(
        "[POST /events/:id/reports] Erro ao adicionar relatório:",
        error
      );
      res.status(500).json({ error: "Erro ao adicionar relatório" });
    }
  }
);

// GET /api/events/:id/reports - Listar relatórios de um evento
router.get("/:id/reports", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [reports] = await db.query(
      `
      SELECT id, file_type, description, created_at
      FROM event_reports
      WHERE event_id = ?
    `,
      [id]
    );

    const reportsWithUrls = reports.map((report) => ({
      ...report,
      file_url: `/api/files/event_reports/${id}/${report.id}`,
    }));

    res.status(200).json(reportsWithUrls);
  } catch (error) {
    console.error(
      "[GET /events/:id/reports] Erro ao listar relatórios:",
      error
    );
    res.status(500).json({ error: "Erro ao listar relatórios" });
  }
});

// Rota para servir arquivos de relatórios
router.get(
  "/files/event_reports/:eventId/:reportId",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, reportId } = req.params;

      if (!isValidUUID(eventId) || !isValidUUID(reportId)) {
        return res.status(400).json({ error: "IDs inválidos" });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const [reports] = await db.query(
        `
        SELECT er.file_data, er.file_type
        FROM event_reports er
        WHERE er.id = ? AND er.event_id = ?
      `,
        [reportId, eventId]
      );

      if (reports.length === 0) {
        return res.status(404).json({ error: "Relatório não encontrado" });
      }

      const report = reports[0];
      let mimeType;
      if (report.file_type === "photo") mimeType = "image/jpeg";
      else if (report.file_type === "video") mimeType = "video/mp4";
      else if (report.file_type === "document") mimeType = "application/pdf";

      res.setHeader("Content-Type", mimeType);
      res.send(report.file_data);
    } catch (error) {
      console.error(
        "[GET /files/event_reports/:eventId/:reportId] Erro ao buscar arquivo:",
        error
      );
      res.status(500).json({ error: "Erro ao buscar arquivo" });
    }
  }
);

// Rota para servir arquivos de comprovantes de pagamento
router.get(
  "/files/event_artists/:eventId/:artistId/payment_proof",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, artistId } = req.params;

      if (!isValidUUID(eventId) || !isValidUUID(artistId)) {
        return res.status(400).json({ error: "IDs inválidos" });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const [records] = await db.query(
        `
        SELECT ea.payment_proof, ea.payment_proof_mime_type
        FROM event_artists ea
        WHERE ea.event_id = ? AND ea.user_id = ?
      `,
        [eventId, artistId]
      );

      if (records.length === 0 || !records[0].payment_proof) {
        return res.status(404).json({ error: "Comprovante não encontrado" });
      }

      const record = records[0];
      res.setHeader("Content-Type", record.payment_proof_mime_type);
      res.send(record.payment_proof);
    } catch (error) {
      console.error(
        "[GET /files/event_artists/:eventId/:artistId/payment_proof] Erro ao buscar arquivo:",
        error
      );
      res.status(500).json({ error: "Erro ao buscar arquivo" });
    }
  }
);

module.exports = router;
