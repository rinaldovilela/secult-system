const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cpfCnpjValidator = require("cpf-cnpj-validator");
const { cpf, cnpj } = cpfCnpjValidator;
const compression = require("compression");
const {
  ensureFolderStructure,
  uploadFile,
} = require("../utils/google-drive-config");

const cache = {};
const CACHE_DURATION = 300000;

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

router.use(compression());

router.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Arquivo muito grande. O limite é 50MB por arquivo." });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

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
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "portfolio", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "related_files", maxCount: 1 },
  ]),
  handleMulterError,
  validateArtistData,
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

      const files = req.files;
      console.log("Arquivos recebidos:", files); // Log para depurar

      const userId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "");

      let profilePictureLink = null,
        profilePictureSize = null,
        profilePictureUploadedAt = null;
      if (files?.profile_picture?.[0]) {
        const eventFolderId = await ensureFolderStructure(userId, null);
        const fileName = `usuario_${userId}_${timestamp}_${files.profile_picture[0].originalname}`;
        const result = await uploadFile(
          files.profile_picture[0],
          eventFolderId,
          fileName
        );
        console.log("Profile Picture Link:", result.link);
        profilePictureLink = result.link;
        profilePictureSize = result.size;
        profilePictureUploadedAt = new Date();
      } else {
        console.log("Nenhum profile_picture enviado.");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.query(
        `INSERT INTO users (id, name, email, password, role, cpf_cnpj, profile_picture_link, profile_picture_size, profile_picture_uploaded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          name,
          email,
          hashedPassword,
          role,
          cpf_cnpj,
          profilePictureLink,
          profilePictureSize,
          profilePictureUploadedAt,
        ]
      );

      if (["artist", "group"].includes(role)) {
        let portfolioLink = null,
          portfolioSize = null,
          portfolioUploadedAt = null;
        let videoLink = null,
          videoSize = null,
          videoUploadedAt = null;
        let relatedFilesLink = null,
          relatedFilesSize = null,
          relatedFilesUploadedAt = null;

        if (files?.portfolio?.[0]) {
          const eventFolderId = await ensureFolderStructure(userId, null);
          const fileName = `usuario_${userId}_${timestamp}_${files.portfolio[0].originalname}`;
          const result = await uploadFile(
            files.portfolio[0],
            eventFolderId,
            fileName
          );
          console.log("Portfolio Link:", result.link);
          portfolioLink = result.link;
          portfolioSize = result.size;
          portfolioUploadedAt = new Date();
        } else {
          console.log("Nenhum portfolio enviado.");
        }
        if (files?.video?.[0]) {
          const eventFolderId = await ensureFolderStructure(userId, null);
          const fileName = `usuario_${userId}_${timestamp}_${files.video[0].originalname}`;
          const result = await uploadFile(
            files.video[0],
            eventFolderId,
            fileName
          );
          console.log("Video Link:", result.link);
          videoLink = result.link;
          videoSize = result.size;
          videoUploadedAt = new Date();
        } else {
          console.log("Nenhum video enviado.");
        }
        if (files?.related_files?.[0]) {
          const eventFolderId = await ensureFolderStructure(userId, null);
          const fileName = `usuario_${userId}_${timestamp}_${files.related_files[0].originalname}`;
          const result = await uploadFile(
            files.related_files[0],
            eventFolderId,
            fileName
          );
          console.log("Related Files Link:", result.link);
          relatedFilesLink = result.link;
          relatedFilesSize = result.size;
          relatedFilesUploadedAt = new Date();
        } else {
          console.log("Nenhum related_files enviado.");
        }

        await connection.query(
          `INSERT INTO artist_group_details (user_id, bio, area_of_expertise, portfolio_link, portfolio_size, portfolio_uploaded_at, video_link, video_size, video_uploaded_at, related_files_link, related_files_size, related_files_uploaded_at, birth_date, address, bank_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            bio,
            area_of_expertise,
            portfolioLink,
            portfolioSize,
            portfolioUploadedAt,
            videoLink,
            videoSize,
            videoUploadedAt,
            relatedFilesLink,
            relatedFilesSize,
            relatedFilesUploadedAt,
            birth_date || null,
            JSON.stringify(address || {}),
            JSON.stringify(bank_details || {}),
          ]
        );
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

module.exports = router;
