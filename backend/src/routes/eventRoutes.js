const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const multer = require("multer");
const {
  ensureFolderStructure,
  uploadFile,
  deleteFile, // Nova função adicionada
} = require("../utils/google-drive-config");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "video/mp4",
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo de arquivo não permitido"), false);
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Arquivo muito grande. O limite é 10MB." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: `Campo inesperado: ${err.field}. Esperado: payment_proof.`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

const createNotification = async (req, userId, type, message) => {
  try {
    if (!isValidUUID(userId)) return;
    const notificationId = uuidv4();
    await db.query(
      `INSERT INTO notifications (id, user_id, type, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
      [notificationId, userId, type, message, false]
    );
    const io = req.app.get("io");
    if (io)
      io.to(userId.toString()).emit("new_notification", {
        id: notificationId,
        user_id: userId,
        type,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error(`[createNotification] Erro para userId: ${userId}`, error);
  }
};

// POST /api/events - Criar um novo evento (apenas admin e secretary)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description, date, location, target_audience } = req.body;

    if (!title || !date || !location || !target_audience) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const formattedDate = new Date(date)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const eventId = uuidv4();

    await db.query(
      `INSERT INTO events (id, title, description, date, location, target_audience, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        eventId,
        title,
        description || null,
        formattedDate,
        location,
        target_audience,
      ]
    );

    res.status(201).json({ message: "Evento criado com sucesso", eventId });
  } catch (error) {
    console.error("[POST /events] Erro:", error);
    res.status(500).json({ error: "Erro ao criar evento" });
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

    // Deletar o comprovante de pagamento do Google Drive, se existir
    if (existing[0].payment_proof_link) {
      await deleteFile(existing[0].payment_proof_link);
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
  handleMulterError,
  async (req, res) => {
    try {
      const { id, artistId } = req.params;
      const { is_paid, amount } = req.body;
      const paymentProof = req.file;

      if (!isValidUUID(id) || !isValidUUID(artistId))
        return res.status(400).json({ error: "IDs inválidos" });
      let parsedIsPaid =
        is_paid === "true" ? true : is_paid === "false" ? false : undefined;
      if (amount !== undefined && (isNaN(amount) || amount <= 0))
        return res.status(400).json({ error: "Amount inválido" });
      if (!["admin", "secretary"].includes(req.user.role))
        return res.status(403).json({ error: "Acesso negado" });

      const [events] = await db.query("SELECT * FROM events WHERE id = ?", [
        id,
      ]);
      if (events.length === 0)
        return res.status(404).json({ error: "Evento não encontrado" });

      const [existing] = await db.query(
        "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
        [id, artistId]
      );
      if (existing.length === 0)
        return res
          .status(404)
          .json({ error: "Artista não encontrado no evento" });

      const updates = {};
      if (parsedIsPaid !== undefined) updates.is_paid = parsedIsPaid;
      if (amount !== undefined) updates.amount = amount;

      if (paymentProof) {
        // Deletar o arquivo antigo do Google Drive, se existir
        if (existing[0].payment_proof_link) {
          await deleteFile(existing[0].payment_proof_link);
        }

        const eventFolderId = await ensureFolderStructure(null, id); // Pasta do evento
        const timestamp = new Date().toISOString().replace(/[:.-]/g, "");
        const fileName = `usuario_${artistId}_evento_${id}_${timestamp}_${paymentProof.originalname}`;
        const result = await uploadFile(paymentProof, eventFolderId, fileName);
        updates.payment_proof_link = result.link;
        updates.payment_proof_size = result.size;
        updates.payment_proof_uploaded_at = new Date();
      } else if (parsedIsPaid === false) {
        // Deletar o arquivo do Google Drive ao remover o comprovante
        if (existing[0].payment_proof_link) {
          await deleteFile(existing[0].payment_proof_link);
        }
        updates.payment_proof_link = null;
        updates.payment_proof_size = null;
        updates.payment_proof_uploaded_at = null;
      }

      const fields = Object.keys(updates);
      if (fields.length === 0)
        return res.status(400).json({ error: "Nenhum campo para atualizar" });

      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((field) => updates[field]);

      await db.query(
        `UPDATE event_artists SET ${setClause} WHERE event_id = ? AND user_id = ?`,
        [...values, id, artistId]
      );

      if (parsedIsPaid !== undefined) {
        await createNotification(
          req,
          artistId,
          "payment_status_updated",
          `Status de pagamento atualizado para ${parsedIsPaid ? "Pago" : "Pendente"} no evento '${events[0].title}'`
        );
      }

      res.status(200).json({ message: "Artista atualizado com sucesso" });
    } catch (error) {
      console.error("[PATCH /events/:id/artists/:artistId] Erro:", error);
      res.status(500).json({ error: "Erro ao atualizar artista" });
    }
  }
);

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
  handleMulterError,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { description } = req.body;
      const file = req.file;

      if (!isValidUUID(id))
        return res.status(400).json({ error: "ID inválido" });
      if (!["admin", "secretary"].includes(req.user.role))
        return res.status(403).json({ error: "Acesso negado" });
      if (!file)
        return res.status(400).json({ error: "Arquivo é obrigatório" });

      const [events] = await db.query("SELECT * FROM events WHERE id = ?", [
        id,
      ]);
      if (events.length === 0)
        return res.status(404).json({ error: "Evento não encontrado" });

      const eventFolderId = await ensureFolderStructure(null, id);
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "");
      const fileName = `evento_${id}_${timestamp}_${file.originalname}`;
      const result = await uploadFile(file, eventFolderId, fileName);
      const reportId = uuidv4();

      await db.query(
        `INSERT INTO event_reports (id, event_id, file_link, file_size, file_uploaded_at, description, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          reportId,
          id,
          result.link,
          result.size,
          new Date(),
          description || null,
        ]
      );

      res.status(201).json({ message: "Relatório adicionado com sucesso" });
    } catch (error) {
      console.error("[POST /events/:id/reports] Erro:", error);
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

// DELETE /api/events/:id/reports/:reportId - Deletar um relatório de um evento
router.delete("/:id/reports/:reportId", authenticateToken, async (req, res) => {
  try {
    const { id, reportId } = req.params;

    if (!isValidUUID(id) || !isValidUUID(reportId)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado" });
    }

    const [reports] = await db.query(
      "SELECT * FROM event_reports WHERE event_id = ? AND id = ?",
      [id, reportId]
    );
    if (reports.length === 0) {
      return res.status(404).json({ error: "Relatório não encontrado" });
    }

    const report = reports[0];

    // Deletar o arquivo do Google Drive
    if (report.file_link) {
      await deleteFile(report.file_link);
    }

    // Deletar o registro do banco de dados
    await db.query("DELETE FROM event_reports WHERE event_id = ? AND id = ?", [
      id,
      reportId,
    ]);

    res.status(200).json({ message: "Relatório deletado com sucesso" });
  } catch (error) {
    console.error(
      "[DELETE /events/:id/reports/:reportId] Erro ao deletar relatório:",
      error
    );
    res.status(500).json({ error: "Erro ao deletar relatório" });
  }
});

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

router.get("/files/events/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `id inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Buscar comprovantes de pagamento dos artistas
    const [artists] = await db.query(
      `
      SELECT user_id as artist_id, payment_proof_link, payment_proof_size, payment_proof_uploaded_at
      FROM event_artists
      WHERE event_id = ? AND payment_proof_link IS NOT NULL
      `,
      [id]
    );

    // Buscar relatórios do evento
    const [reports] = await db.query(
      `
      SELECT id as report_id, file_link, file_size, file_uploaded_at, description
      FROM event_reports
      WHERE event_id = ?
      `,
      [id]
    );

    const files = {
      payment_proofs: artists.map((artist) => ({
        type: "payment_proof",
        artist_id: artist.artist_id,
        link: artist.payment_proof_link,
        size: artist.payment_proof_size,
        uploaded_at: artist.payment_proof_uploaded_at,
      })),
      reports: reports.map((report) => ({
        type: "report",
        report_id: report.report_id,
        link: report.file_link,
        size: report.file_size,
        uploaded_at: report.file_uploaded_at,
        description: report.description,
      })),
    };

    res.status(200).json(files);
  } catch (error) {
    console.error("[GET /files/events/:id] Erro:", error);
    res.status(500).json({ error: "Erro ao listar arquivos do evento" });
  }
});

module.exports = router;
