const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const {
  fileValidation,
  checkFileLimit,
} = require("../middleware/fileValidation");
const DriveService = require("../utils/google-drive-config");
const compression = require("compression");

const cache = {};
const CACHE_DURATION = 300000;

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

router.use(compression());

router.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

const validateArtistData = async (req, res, next) => {
  if (["artist", "group"].includes(req.body.role)) {
    try {
      const address =
        typeof req.body.address === "string"
          ? JSON.parse(req.body.address || "{}")
          : req.body.address || {};
      const bankDetails =
        typeof req.body.bank_details === "string"
          ? JSON.parse(req.body.bank_details || "{}")
          : req.body.bank_details || {};
      if (
        address &&
        (!address.cep ||
          !address.logradouro ||
          !address.numero ||
          !address.bairro ||
          !address.cidade ||
          !address.estado)
      ) {
        return res.status(400).json({
          error: "Endereço incompleto",
          required_fields: [
            "cep",
            "logradouro",
            "numero",
            "bairro",
            "cidade",
            "estado",
          ],
        });
      }
      if (
        bankDetails &&
        (!bankDetails.bank_name ||
          !bankDetails.account_type ||
          !bankDetails.agency ||
          !bankDetails.account_number)
      ) {
        return res.status(400).json({
          error: "Dados bancários incompletos",
          required_fields: [
            "bank_name",
            "account_type",
            "agency",
            "account_number",
          ],
        });
      }
      if (address) req.body.address = address;
      if (bankDetails) req.body.bank_details = bankDetails;
    } catch (error) {
      return res
        .status(400)
        .json({ error: "Erro ao processar JSON", details: error.message });
    }
  }
  next();
};

router.post(
  "/register",
  validateArtistData,
  fileValidation(["profile_picture", "portfolio", "video", "related_files"]),
  checkFileLimit,
  async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const {
        name,
        email,
        password,
        role = "artist",
        cpf_cnpj,
        bio = "",
        area_of_expertise = "",
        birth_date,
        address,
        bank_details,
      } = req.body;

      const files = req.files || {};
      console.log("Arquivos recebidos:", files);

      const userId = uuidv4();

      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.query(
        `INSERT INTO users (id, name, email, password, role, cpf_cnpj, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [userId, name, email, hashedPassword, role, cpf_cnpj || null]
      );

      if (["artist", "group"].includes(role)) {
        await connection.query(
          `INSERT INTO artist_group_details (user_id, bio, area_of_expertise, birth_date, address, bank_details) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            bio,
            area_of_expertise,
            birth_date || null,
            JSON.stringify(address || {}),
            JSON.stringify(bank_details || {}),
          ]
        );

        if (files.profile_picture) {
          await DriveService.uploadFile(
            files.profile_picture[0],
            "user",
            userId,
            "profile_picture"
          );
        }
        if (files.portfolio) {
          await DriveService.uploadFile(
            files.portfolio[0],
            "user",
            userId,
            "portfolio"
          );
        }
        if (files.video) {
          await DriveService.uploadFile(
            files.video[0],
            "user",
            userId,
            "video"
          );
        }
        if (files.related_files) {
          await DriveService.uploadFile(
            files.related_files[0],
            "user",
            userId,
            "related_files"
          );
        }
      }

      await connection.commit();
      res.status(201).json({
        success: true,
        message: "Usuário registrado com sucesso",
        userId,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Erro no registro:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro durante o registro",
      });
    } finally {
      connection.release();
    }
  }
);

// GET /api/users/:id - Listar arquivos de um usuário
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) return res.status(400).json({ error: "ID inválido" });

    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (users.length === 0)
      return res.status(404).json({ error: "Usuário não encontrado" });

    if (req.user.id !== id && !["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [files] = await db.query(
      `SELECT file_type, file_link, file_size, uploaded_at
      FROM files
      WHERE entity_type = 'user' AND entity_id = ? AND deleted_at IS NULL`,
      [id]
    );

    const mappedFiles = files.map((file) => ({
      type: file.file_type,
      link: file.file_link,
      size: file.file_size,
      uploaded_at: file.uploaded_at,
    }));

    res.status(200).json({ files: mappedFiles });
  } catch (error) {
    console.error("[GET /users/:id] Erro:", error);
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

module.exports = router;
