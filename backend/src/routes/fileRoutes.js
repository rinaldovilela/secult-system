const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

// GET /api/files/users/:id - Listar arquivos de um usuário
router.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) return res.status(400).json({ error: "ID inválido" });

    // Verificar se o usuário existe
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (users.length === 0)
      return res.status(404).json({ error: "Usuário não encontrado" });

    // Verificar permissões
    if (req.user.id !== id && !["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Obter arquivos do usuário
    const [userFiles] = await db.query(
      "SELECT profile_picture_link, profile_picture_size, profile_picture_uploaded_at FROM users WHERE id = ?",
      [id]
    );
    const [artistDetails] = await db.query(
      "SELECT portfolio_link, portfolio_size, portfolio_uploaded_at, video_link, video_size, video_uploaded_at, related_files_link, related_files_size, related_files_uploaded_at FROM artist_group_details WHERE user_id = ?",
      [id]
    );

    const files = [];

    if (userFiles[0].profile_picture_link) {
      files.push({
        type: "profile_picture",
        link: userFiles[0].profile_picture_link,
        size: userFiles[0].profile_picture_size,
        uploaded_at: userFiles[0].profile_picture_uploaded_at,
      });
    }

    if (artistDetails.length > 0) {
      if (artistDetails[0].portfolio_link) {
        files.push({
          type: "portfolio",
          link: artistDetails[0].portfolio_link,
          size: artistDetails[0].portfolio_size,
          uploaded_at: artistDetails[0].portfolio_uploaded_at,
        });
      }
      if (artistDetails[0].video_link) {
        files.push({
          type: "video",
          link: artistDetails[0].video_link,
          size: artistDetails[0].video_size,
          uploaded_at: artistDetails[0].video_uploaded_at,
        });
      }
      if (artistDetails[0].related_files_link) {
        files.push({
          type: "related_files",
          link: artistDetails[0].related_files_link,
          size: artistDetails[0].related_files_size,
          uploaded_at: artistDetails[0].related_files_uploaded_at,
        });
      }
    }

    res.status(200).json({ files });
  } catch (error) {
    console.error("[GET /files/users/:id] Erro:", error);
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

// GET /api/files/events/:id - Listar arquivos de um evento
router.get("/events/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) return res.status(400).json({ error: "ID inválido" });

    // Verificar se o evento existe
    const [events] = await db.query("SELECT * FROM events WHERE id = ?", [id]);
    if (events.length === 0)
      return res.status(404).json({ error: "Evento não encontrado" });

    // Verificar permissões
    if (!["admin", "secretary"].includes(req.user.role)) {
      const [eventArtists] = await db.query(
        "SELECT * FROM event_artists WHERE event_id = ? AND user_id = ?",
        [id, req.user.id]
      );
      if (eventArtists.length === 0)
        return res.status(403).json({ error: "Acesso negado" });
    }

    // Obter arquivos do evento (comprovantes de pagamento e relatórios)
    const [eventArtists] = await db.query(
      "SELECT user_id, payment_proof_link, payment_proof_size, payment_proof_uploaded_at FROM event_artists WHERE event_id = ? AND payment_proof_link IS NOT NULL",
      [id]
    );
    const [eventReports] = await db.query(
      "SELECT file_link, file_size, file_uploaded_at, description FROM event_reports WHERE event_id = ?",
      [id]
    );

    const files = [];

    eventArtists.forEach((artist) => {
      files.push({
        type: "payment_proof",
        user_id: artist.user_id,
        link: artist.payment_proof_link,
        size: artist.payment_proof_size,
        uploaded_at: artist.payment_proof_uploaded_at,
      });
    });

    eventReports.forEach((report) => {
      files.push({
        type: "event_report",
        description: report.description,
        link: report.file_link,
        size: report.file_size,
        uploaded_at: report.file_uploaded_at,
      });
    });

    res.status(200).json({ files });
  } catch (error) {
    console.error("[GET /files/events/:id] Erro:", error);
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

// GET /api/files/event_reports/:eventId/:reportId - Acessar um relatório específico
router.get(
  "/event_reports/:eventId/:reportId",
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
      SELECT file_link, file_type
      FROM event_reports
      WHERE id = ? AND event_id = ?
      `,
        [reportId, eventId]
      );

      if (reports.length === 0) {
        return res.status(404).json({ error: "Relatório não encontrado" });
      }

      const report = reports[0];
      const mimeType =
        report.file_type === "document"
          ? "application/pdf"
          : report.file_type === "photo"
            ? "image/jpeg"
            : report.file_type === "video"
              ? "video/mp4"
              : "application/octet-stream";

      // Redirecionar para o link do Google Drive
      res.redirect(report.file_link);
    } catch (error) {
      console.error(
        "[GET /files/event_reports/:eventId/:reportId] Erro ao buscar arquivo:",
        error
      );
      res.status(500).json({ error: "Erro ao buscar arquivo" });
    }
  }
);

module.exports = router;
