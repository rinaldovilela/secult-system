const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const multer = require("multer");
const { google } = require("googleapis");
const path = require("path");

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
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo de arquivo não permitido"), false);
  },
});

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

const createNotification = async (req, userId, type, message) => {
  try {
    if (!isValidUUID(userId)) {
      console.error(`[createNotification] userId inválido: ${userId}`);
      return;
    }

    const notificationId = uuidv4();
    await db.query(
      "INSERT INTO notifications (id, user_id, type, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [notificationId, userId, type, message, false]
    );

    const notification = {
      id: notificationId,
      user_id: userId,
      type,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const io = req.app.get("io");
    if (io) io.to(userId.toString()).emit("new_notification", notification);
  } catch (error) {
    console.error(
      `[createNotification] Erro ao criar notificação para userId: ${userId}`,
      error
    );
  }
};

const uploadToGoogleDrive = async (
  file,
  driveAccountId,
  entityId,
  entityType
) => {
  const credentialsPath = path.join(
    __dirname,
    `../config/drive_credentials_${driveAccountId}.json`
  );
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: `${entityType}_${entityId}_${Date.now()}_${file.originalname}`,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || "root"],
  };
  const media = { mimeType: file.mimetype, body: file.buffer };

  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, webViewLink",
  });
  return response.data.webViewLink;
};

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

    const formattedDate = new Date(date)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const eventId = uuidv4();

    await db.query(
      "INSERT INTO events (id, title, description, date, location, target_audience, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
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
        if (!isValidUUID(artist_id))
          return res
            .status(400)
            .json({ error: `artist_id inválido: ${artist_id}` });
        await db.query(
          "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?)",
          [eventId, artist_id, amount, false]
        );
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

router.get("/", authenticateToken, async (req, res) => {
  try {
    const [events] = await db.query("SELECT * FROM events");
    const eventsWithArtists = await Promise.all(
      events.map(async (event) => {
        const [artists] = await db.query(
          "SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid FROM event_artists ea LEFT JOIN users u ON ea.user_id = u.id WHERE ea.event_id = ?",
          [event.id]
        );
        return {
          ...event,
          artists: artists.map((artist) => ({
            ...artist,
            amount: Number(artist.amount),
            payment_proof_url: null,
          })),
        };
      })
    );
    res.status(200).json(eventsWithArtists);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id))
      return res.status(400).json({ error: `id inválido: ${id}` });
    const [events] = await db.query("SELECT e.* FROM events e WHERE e.id = ?", [
      id,
    ]);
    if (events.length === 0)
      return res.status(404).json({ error: "Evento não encontrado" });
    const event = events[0];
    const [artists] = await db.query(
      "SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid FROM event_artists ea LEFT JOIN users u ON ea.user_id = u.id WHERE ea.event_id = ?",
      [id]
    );
    const parsedArtists = artists.map((artist) => ({
      ...artist,
      amount: Number(artist.amount),
      payment_proof_url: null,
    }));
    res.status(200).json({ ...event, artists: parsedArtists });
  } catch (error) {
    console.error("Erro ao buscar evento:", error);
    res.status(500).json({ error: "Erro ao buscar evento" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, target_audience } = req.body;
    if (!isValidUUID(id))
      return res.status(400).json({ error: `id inválido: ${id}` });
    if (!title || !date || !location || !target_audience)
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    if (!["admin", "secretary"].includes(req.user.role))
      return res.status(403).json({ error: "Acesso negado" });
    const formattedDate = new Date(date)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const [result] = await db.query(
      "UPDATE events SET title = ?, description = ?, date = ?, location = ?, target_audience = ? WHERE id = ?",
      [title, description || null, formattedDate, location, target_audience, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Evento não encontrado" });
    res.status(200).json({ message: "Evento atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    res.status(500).json({ error: "Erro ao atualizar evento" });
  }
});

router.post("/:id/artists", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { artist_id, amount } = req.body;
    if (!isValidUUID(id) || !isValidUUID(artist_id))
      return res
        .status(400)
        .json({ error: `ID inválido: ${id} ou ${artist_id}` });
    if (!artist_id || !amount)
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    if (!["admin", "secretary"].includes(req.user.role))
      return res.status(403).json({ error: "Acesso negado" });
    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0)
      return res.status(404).json({ error: "Evento não encontrado" });
    const [artists] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role IN ('artist', 'group')",
      [artist_id]
    );
    if (artists.length === 0)
      return res.status(404).json({ error: "Artista ou grupo não encontrado" });
    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artist_id]
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({ error: "Artista ou grupo já está associado ao evento" });
    await db.query(
      "INSERT INTO event_artists (event_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?)",
      [id, artist_id, amount, false]
    );
    await createNotification(
      req,
      artist_id,
      "artist_added",
      `Você foi adicionado ao evento '${events[0].title}' agendado para ${new Date(events[0].date).toLocaleDateString("pt-BR")}.`
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

router.delete("/:id/artists/:artistId", authenticateToken, async (req, res) => {
  try {
    const { id, artistId } = req.params;
    if (!isValidUUID(id) || !isValidUUID(artistId))
      return res
        .status(400)
        .json({ error: `ID inválido: ${id} ou ${artistId}` });
    if (!["admin", "secretary"].includes(req.user.role))
      return res.status(403).json({ error: "Acesso negado" });
    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0)
      return res.status(404).json({ error: "Evento não encontrado" });
    const [existing] = await db.query(
      "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );
    if (existing.length === 0)
      return res
        .status(404)
        .json({ error: "Artista ou grupo não encontrado no evento" });
    await db.query(
      "DELETE FROM event_artists WHERE event_id = ? AND user_id = ?",
      [id, artistId]
    );
    await createNotification(
      req,
      artistId,
      "artist_removed",
      `Você foi removido do evento '${events[0].title}' agendado para ${new Date(events[0].date).toLocaleDateString("pt-BR")}.`
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

router.patch(
  "/:id/artists/:artistId",
  authenticateToken,
  upload.single("payment_proof"),
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
        return res
          .status(400)
          .json({ error: "O campo amount deve ser um número positivo" });
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
          .json({ error: "Artista ou grupo não encontrado no evento" });

      const updates = {};
      if (parsedIsPaid !== undefined) updates.is_paid = parsedIsPaid;
      if (amount !== undefined) updates.amount = amount;
      if (paymentProof) {
        const [drive] = await db.query(
          "SELECT id FROM drives WHERE is_active = TRUE LIMIT 1"
        );
        if (drive.length) {
          const driveId = drive[0].id;
          updates.payment_proof_url = await uploadToGoogleDrive(
            paymentProof,
            driveId,
            `${id}_${artistId}`,
            "payment_proof"
          );
          await db.query(
            "INSERT INTO files (id, entity_id, entity_type, file_link, uploaded_at) VALUES (?, ?, ?, ?, NOW())",
            [
              uuidv4(),
              `${id}_${artistId}`,
              "payment_proof",
              updates.payment_proof_url,
            ]
          );
        }
      } else if (parsedIsPaid === false) {
        await db.query(
          "DELETE FROM files WHERE entity_id = ? AND entity_type = ?",
          [`${id}_${artistId}`, "payment_proof"]
        );
      }

      const fields = Object.keys(updates).filter(
        (k) => k !== "payment_proof_url"
      );
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
          `O status de pagamento do evento '${events[0].title}' foi atualizado para ${parsedIsPaid ? "Pago" : "Pendente"}.`
        );
      }

      res.status(200).json({
        message: "Artista atualizado com sucesso",
        payment_proof_url: updates.payment_proof_url,
      });
    } catch (error) {
      console.error(
        "[PATCH /events/:id/artists/:artistId] Erro ao atualizar artista:",
        error
      );
      res.status(500).json({ error: "Erro ao atualizar artista" });
    }
  }
);

router.get("/details/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id))
      return res.status(400).json({ error: `id inválido: ${id}` });
    if (!["admin", "secretary"].includes(req.user.role))
      return res.status(403).json({ error: "Acesso negado" });
    const [events] = await db.query(
      "SELECT id, title, date, description, location, created_at FROM events WHERE id = ?",
      [id]
    );
    if (events.length === 0)
      return res.status(404).json({ error: "Evento não encontrado" });
    const event = events[0];
    const [artists] = await db.query(
      "SELECT ea.user_id as artist_id, u.name as artist_name, ea.amount, ea.is_paid FROM event_artists ea LEFT JOIN users u ON ea.user_id = u.id WHERE ea.event_id = ?",
      [id]
    );
    const parsedArtists = artists.map((artist) => ({
      ...artist,
      amount: Number(artist.amount),
      is_paid: Boolean(artist.is_paid),
      payment_proof_url: null,
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

      if (!isValidUUID(id))
        return res.status(400).json({ error: `id inválido: ${id}` });
      if (!["admin", "secretary"].includes(req.user.role))
        return res.status(403).json({ error: "Acesso negado" });
      if (!file || !file_type)
        return res
          .status(400)
          .json({ error: "Arquivo e tipo de arquivo são obrigatórios" });
      if (!["photo", "video", "document"].includes(file_type))
        return res.status(400).json({ error: "Tipo de arquivo inválido" });
      const [events] = await db.query("SELECT * FROM events WHERE id = ?", [
        id,
      ]);
      if (events.length === 0)
        return res.status(404).json({ error: "Evento não encontrado" });

      const [drive] = await db.query(
        "SELECT id FROM drives WHERE is_active = TRUE LIMIT 1"
      );
      if (drive.length) {
        const driveId = drive[0].id;
        const fileLink = await uploadToGoogleDrive(
          file,
          driveId,
          `${id}_report`,
          file_type
        );
        const reportId = uuidv4();
        await db.query(
          "INSERT INTO files (id, entity_id, entity_type, file_link, uploaded_at) VALUES (?, ?, ?, ?, NOW())",
          [reportId, `${id}_report`, file_type, fileLink]
        );
        await db.query(
          "INSERT INTO event_reports (id, event_id, file_type, description, created_at) VALUES (?, ?, ?, ?, NOW())",
          [reportId, id, file_type, description || null]
        );
      }

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

router.get("/:id/reports", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id))
      return res.status(400).json({ error: `id inválido: ${id}` });
    if (!["admin", "secretary"].includes(req.user.role))
      return res.status(403).json({ error: "Acesso negado" });
    const [reports] = await db.query(
      "SELECT er.id, er.file_type, er.description, er.created_at FROM event_reports er WHERE er.event_id = ?",
      [id]
    );
    const reportsWithUrls = await Promise.all(
      reports.map(async (report) => {
        const [file] = await db.query(
          "SELECT file_link FROM files WHERE id = ?",
          [report.id]
        );
        return { ...report, file_url: file[0]?.file_link || null };
      })
    );
    res.status(200).json(reportsWithUrls);
  } catch (error) {
    console.error(
      "[GET /events/:id/reports] Erro ao listar relatórios:",
      error
    );
    res.status(500).json({ error: "Erro ao listar relatórios" });
  }
});

router.get(
  "/files/event_reports/:eventId/:reportId",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, reportId } = req.params;
      if (!isValidUUID(eventId) || !isValidUUID(reportId))
        return res.status(400).json({ error: "IDs inválidos" });
      if (!["admin", "secretary"].includes(req.user.role))
        return res.status(403).json({ error: "Acesso negado" });
      const [file] = await db.query(
        "SELECT file_link FROM files WHERE id = ? AND entity_id LIKE ?",
        [reportId, `${eventId}_report%`]
      );
      if (!file.length || !file[0].file_link)
        return res.status(404).json({ error: "Relatório não encontrado" });
      res.redirect(file[0].file_link);
    } catch (error) {
      console.error(
        "[GET /files/event_reports/:eventId/:reportId] Erro ao buscar arquivo:",
        error
      );
      res.status(500).json({ error: "Erro ao buscar arquivo" });
    }
  }
);

router.get(
  "/files/event_artists/:eventId/:artistId/payment_proof",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, artistId } = req.params;
      if (!isValidUUID(eventId) || !isValidUUID(artistId))
        return res.status(400).json({ error: "IDs inválidos" });
      if (!["admin", "secretary"].includes(req.user.role))
        return res.status(403).json({ error: "Acesso negado" });
      const [file] = await db.query(
        "SELECT file_link FROM files WHERE entity_id = ? AND entity_type = ?",
        [`${eventId}_${artistId}`, "payment_proof"]
      );
      if (!file.length || !file[0].file_link)
        return res.status(404).json({ error: "Comprovante não encontrado" });
      res.redirect(file[0].file_link);
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
