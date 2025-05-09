const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const multer = require("multer");
const DriveService = require("../utils/google-drive-config");

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

router.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

// Configuração do multer com validação de tipos, tamanhos e quantidade
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // Limite máximo geral (será sobrescrito por fileFilter)
  fileFilter: async (req, file, cb) => {
    // Tipos permitidos para artistas/grupos
    const allowedTypes = [
      "image/jpeg", // .jpg, .jpeg
      "image/png", // .png
      "application/pdf", // .pdf
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "video/mp4", // .mp4
      "audio/mpeg", // .mp3
      "audio/wav", // .wav
      "application/zip", // .zip
    ];

    // Limites de tamanho por tipo (em bytes)
    const sizeLimits = {
      "image/jpeg": 5 * 1024 * 1024, // 5 MB
      "image/png": 5 * 1024 * 1024, // 5 MB
      "application/pdf": 10 * 1024 * 1024, // 10 MB
      "application/msword": 5 * 1024 * 1024, // 5 MB
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        5 * 1024 * 1024, // 5 MB
      "video/mp4": 50 * 1024 * 1024, // 50 MB
      "audio/mpeg": 10 * 1024 * 1024, // 10 MB
      "audio/wav": 10 * 1024 * 1024, // 10 MB
      "application/zip": 50 * 1024 * 1024, // 50 MB
    };

    // Validação de tipo
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido"), false);
    }

    // Validação de tamanho
    const maxSize = sizeLimits[file.mimetype];
    if (file.size > maxSize) {
      return cb(
        new Error(
          `Arquivo muito grande. Limite para ${file.mimetype} é ${maxSize / 1024 / 1024} MB`
        ),
        false
      );
    }

    // Validação de quantidade (máximo 10 arquivos por portfólio)
    try {
      let userId;
      if (req.path === "/register" || req.path === "/") {
        userId = uuidv4(); // Novo usuário, será gerado um ID
      } else if (req.path === "/me") {
        userId = req.user.id;
      } else if (req.params.id) {
        userId = req.params.id;
      }

      if (!userId) {
        return cb(
          new Error("Não foi possível determinar o ID do usuário"),
          false
        );
      }

      const [existingFiles] = await db.query(
        "SELECT COUNT(*) as count FROM files WHERE entity_id = ? AND entity_type IN ('user', 'portfolio', 'video', 'related_files') AND deleted_at IS NULL",
        [userId]
      );
      const fileCount = existingFiles[0].count;

      // Considerar os arquivos que estão sendo enviados na requisição atual
      const newFilesCount = Object.values(req.files || {}).reduce(
        (total, files) => total + files.length,
        0
      );
      if (fileCount + newFilesCount > 10) {
        return cb(
          new Error("Limite de 10 arquivos por portfólio excedido"),
          false
        );
      }

      cb(null, true);
    } catch (error) {
      cb(
        new Error("Erro ao verificar limite de arquivos: " + error.message),
        false
      );
    }
  },
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
          ? JSON.parse(req.body.address)
          : req.body.address;
      if (
        !address?.cep ||
        !address?.logradouro ||
        !address?.numero ||
        !address?.bairro ||
        !address?.cidade ||
        !address?.estado
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
      const bankDetails =
        typeof req.body.bank_details === "string"
          ? JSON.parse(req.body.bank_details)
          : req.body.bank_details;
      if (
        !bankDetails?.bank_name ||
        !bankDetails?.account_type ||
        !bankDetails?.agency ||
        !bankDetails?.account_number
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
      req.body.address = address;
      req.body.bank_details = bankDetails;
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

      if (!name || !email || !password || !cpf_cnpj) {
        throw new Error("Nome, email, senha e CPF/CNPJ são obrigatórios");
      }

      if (!cpf.isValid(cpf_cnpj) && !cnpj.isValid(cpf_cnpj)) {
        throw new Error("CPF ou CNPJ inválido");
      }

      const [existing] = await connection.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (existing.length > 0) {
        throw new Error("Email já está em uso");
      }

      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.query(
        "INSERT INTO users (id, name, email, password, role, cpf_cnpj, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [userId, name, email, hashedPassword, role, cpf_cnpj || null]
      );

      if (["artist", "group"].includes(role)) {
        const fileLinks = {};

        if (files.profile_picture) {
          const uploadResult = await DriveService.uploadFile(
            files.profile_picture[0],
            "user",
            userId,
            "photo"
          );
          fileLinks.profile_picture = uploadResult.link;
        }
        if (files.portfolio) {
          const uploadResult = await DriveService.uploadFile(
            files.portfolio[0],
            "portfolio",
            userId,
            "document"
          );
          fileLinks.portfolio = uploadResult.link;
        }
        if (files.video) {
          const uploadResult = await DriveService.uploadFile(
            files.video[0],
            "video",
            userId,
            "video"
          );
          fileLinks.video = uploadResult.link;
        }
        if (files.related_files) {
          const uploadResult = await DriveService.uploadFile(
            files.related_files[0],
            "related_files",
            userId,
            "document"
          );
          fileLinks.related_files = uploadResult.link;
        }

        await connection.query(
          "INSERT INTO artist_group_details (user_id, bio, area_of_expertise, birth_date, address, bank_details) VALUES (?, ?, ?, ?, ?, ?)",
          [
            userId,
            bio,
            area_of_expertise,
            birth_date || null,
            JSON.stringify(address),
            JSON.stringify(bank_details),
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

router.get("/artists", authenticateToken, async (req, res) => {
  try {
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role, agd.bio, agd.area_of_expertise, agd.birth_date
      FROM users u
      LEFT JOIN artist_group_details agd ON u.id = agd.user_id
      WHERE u.role IN ('artist', 'group')
    `
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao listar usuários artistas:", error);
    res.status(500).json({ error: "Erro ao listar usuários artistas" });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    if (!isValidUUID(req.user.id)) {
      return res
        .status(400)
        .json({ error: `ID de usuário inválido: ${req.user.id}` });
    }

    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role,
             agd.bio, agd.area_of_expertise, agd.birth_date, agd.address, agd.bank_details
      FROM users u
      LEFT JOIN artist_group_details agd ON u.id = agd.user_id
      WHERE u.id = ?
    `,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];
    const [files] = await db.query(
      "SELECT entity_type, file_link FROM files WHERE entity_id = ?",
      [req.user.id]
    );
    const fileLinks = files.reduce(
      (acc, file) => ({ ...acc, [file.entity_type]: file.file_link }),
      {}
    );

    res.status(200).json({ ...user, ...fileLinks });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

router.put(
  "/me",
  authenticateToken,
  upload.fields([{ name: "profile_picture", maxCount: 1 }]),
  handleMulterError,
  async (req, res) => {
    try {
      if (!isValidUUID(req.user.id)) {
        return res
          .status(400)
          .json({ error: `ID de usuário inválido: ${req.user.id}` });
      }

      const { name, bio, area_of_expertise } = req.body;
      const files = req.files;

      await db.query("UPDATE users SET name = ? WHERE id = ?", [
        name,
        req.user.id,
      ]);

      if (["artist", "group"].includes(req.user.role)) {
        await db.query(
          "UPDATE artist_group_details SET bio = ?, area_of_expertise = ? WHERE user_id = ?",
          [bio, area_of_expertise, req.user.id]
        );

        if (files.profile_picture) {
          // Verificar se já existe um arquivo para esse entity_type
          const [existingFile] = await db.query(
            "SELECT file_link FROM files WHERE entity_id = ? AND entity_type = ? AND deleted_at IS NULL",
            [req.user.id, "user"]
          );

          if (existingFile.length > 0) {
            // Deletar o arquivo antigo
            await DriveService.deleteFile(existingFile[0].file_link);
          }

          // Fazer o upload do novo arquivo
          const uploadResult = await DriveService.uploadFile(
            files.profile_picture[0],
            "user",
            req.user.id,
            "photo"
          );
        }
      }

      res.status(200).json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  }
);

router.get("/me/events", authenticateToken, async (req, res) => {
  try {
    if (!["artist", "group"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (!isValidUUID(req.user.id)) {
      return res
        .status(400)
        .json({ error: `ID de usuário inválido: ${req.user.id}` });
    }

    const [events] = await db.query(
      `
      SELECT e.id, e.title, e.date, ea.is_paid
      FROM events e
      JOIN event_artists ea ON e.id = ea.event_id
      WHERE ea.user_id = ?
    `,
      [req.user.id]
    );

    const mappedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      status: event.is_paid ? "Confirmado" : "Pendente",
    }));

    res.status(200).json(mappedEvents);
  } catch (error) {
    console.error("Erro ao listar eventos do usuário:", error);
    res.status(500).json({ error: "Erro ao listar eventos do usuário" });
  }
});

router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "portfolio", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "related_files", maxCount: 1 },
  ]),
  handleMulterError,
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        cpf_cnpj,
        bio = "",
        area_of_expertise = "",
        birth_date,
        address,
        bank_details,
      } = req.body;
      const files = req.files;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes" });
      }

      if (!["artist", "group"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Role inválido. Use 'artist' ou 'group'" });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!cpf_cnpj || (!cpf.isValid(cpf_cnpj) && !cnpj.isValid(cpf_cnpj))) {
        return res.status(400).json({ error: "CPF ou CNPJ inválido" });
      }

      if (["artist", "group"].includes(role) && (!address || !bank_details)) {
        return res.status(400).json({
          error:
            "Endereço e dados bancários são obrigatórios para artistas/grupos",
        });
      }

      const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      await db.query(
        "INSERT INTO users (id, name, email, password, role, cpf_cnpj, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [userId, name, email, hashedPassword, role, cpf_cnpj]
      );

      if (["artist", "group"].includes(role)) {
        const fileLinks = {};

        if (files.profile_picture) {
          const uploadResult = await DriveService.uploadFile(
            files.profile_picture[0],
            "user",
            userId,
            "photo"
          );
          fileLinks.profile_picture = uploadResult.link;
        }
        if (files.portfolio) {
          const uploadResult = await DriveService.uploadFile(
            files.portfolio[0],
            "portfolio",
            userId,
            "document"
          );
          fileLinks.portfolio = uploadResult.link;
        }
        if (files.video) {
          const uploadResult = await DriveService.uploadFile(
            files.video[0],
            "video",
            userId,
            "video"
          );
          fileLinks.video = uploadResult.link;
        }
        if (files.related_files) {
          const uploadResult = await DriveService.uploadFile(
            files.related_files[0],
            "related_files",
            userId,
            "document"
          );
          fileLinks.related_files = uploadResult.link;
        }

        await db.query(
          "INSERT INTO artist_group_details (user_id, bio, area_of_expertise, birth_date, address, bank_details) VALUES (?, ?, ?, ?, ?, ?)",
          [
            userId,
            bio,
            area_of_expertise,
            birth_date || null,
            JSON.stringify(address),
            JSON.stringify(bank_details),
          ]
        );
      }

      res.status(201).json({ message: "Usuário cadastrado com sucesso" });
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error);
      res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
  }
);

router.put(
  "/:id",
  authenticateToken,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "portfolio", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "related_files", maxCount: 1 },
  ]),
  handleMulterError,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        bio,
        area_of_expertise,
        role,
        cpf_cnpj,
        birth_date,
        address,
        bank_details,
      } = req.body;
      const files = req.files;

      if (!isValidUUID(id)) {
        return res.status(400).json({ error: `ID inválido: ${id}` });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!name || !email || !role || !cpf_cnpj) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes" });
      }

      if (!cpf.isValid(cpf_cnpj) && !cnpj.isValid(cpf_cnpj)) {
        return res.status(400).json({ error: "CPF ou CNPJ inválido" });
      }

      if (!["artist", "group"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Role inválido. Use 'artist' ou 'group'" });
      }

      const [existing] = await db.query(
        "SELECT * FROM users WHERE email = ? AND id != ?",
        [email, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      const fileLinks = {};

      if (files.profile_picture) {
        const [existingFile] = await db.query(
          "SELECT file_link FROM files WHERE entity_id = ? AND entity_type = ? AND deleted_at IS NULL",
          [id, "user"]
        );
        if (existingFile.length > 0) {
          await DriveService.deleteFile(existingFile[0].file_link);
        }
        const uploadResult = await DriveService.uploadFile(
          files.profile_picture[0],
          "user",
          id,
          "photo"
        );
        fileLinks.profile_picture = uploadResult.link;
      }
      if (files.portfolio) {
        const [existingFile] = await db.query(
          "SELECT file_link FROM files WHERE entity_id = ? AND entity_type = ? AND deleted_at IS NULL",
          [id, "portfolio"]
        );
        if (existingFile.length > 0) {
          await DriveService.deleteFile(existingFile[0].file_link);
        }
        const uploadResult = await DriveService.uploadFile(
          files.portfolio[0],
          "portfolio",
          id,
          "document"
        );
        fileLinks.portfolio = uploadResult.link;
      }
      if (files.video) {
        const [existingFile] = await db.query(
          "SELECT file_link FROM files WHERE entity_id = ? AND entity_type = ? AND deleted_at IS NULL",
          [id, "video"]
        );
        if (existingFile.length > 0) {
          await DriveService.deleteFile(existingFile[0].file_link);
        }
        const uploadResult = await DriveService.uploadFile(
          files.video[0],
          "video",
          id,
          "video"
        );
        fileLinks.video = uploadResult.link;
      }
      if (files.related_files) {
        const [existingFile] = await db.query(
          "SELECT file_link FROM files WHERE entity_id = ? AND entity_type = ? AND deleted_at IS NULL",
          [id, "related_files"]
        );
        if (existingFile.length > 0) {
          await DriveService.deleteFile(existingFile[0].file_link);
        }
        const uploadResult = await DriveService.uploadFile(
          files.related_files[0],
          "related_files",
          id,
          "document"
        );
        fileLinks.related_files = uploadResult.link;
      }

      await db.query(
        "UPDATE users SET name = ?, email = ?, role = ?, cpf_cnpj = ? WHERE id = ?",
        [name, email, role, cpf_cnpj, id]
      );

      if (["artist", "group"].includes(role)) {
        const addressObj =
          address && typeof address === "string"
            ? JSON.parse(address)
            : address;
        const bankDetailsObj =
          bank_details && typeof bank_details === "string"
            ? JSON.parse(bank_details)
            : bank_details;

        const [existingDetails] = await db.query(
          "SELECT * FROM artist_group_details WHERE user_id = ?",
          [id]
        );
        if (existingDetails.length > 0) {
          await db.query(
            "UPDATE artist_group_details SET bio = ?, area_of_expertise = ?, birth_date = ?, address = ?, bank_details = ? WHERE user_id = ?",
            [
              bio,
              area_of_expertise,
              birth_date || null,
              addressObj
                ? JSON.stringify(addressObj)
                : existingDetails[0].address,
              bankDetailsObj
                ? JSON.stringify(bankDetailsObj)
                : existingDetails[0].bank_details,
              id,
            ]
          );
        } else {
          await db.query(
            "INSERT INTO artist_group_details (user_id, bio, area_of_expertise, birth_date, address, bank_details) VALUES (?, ?, ?, ?, ?, ?)",
            [
              id,
              bio,
              area_of_expertise,
              birth_date || null,
              JSON.stringify(addressObj),
              JSON.stringify(bankDetailsObj),
            ]
          );
        }
      }

      res.status(200).json({ message: "Usuário atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  }
);

router.get("/details/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `ID inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             agd.bio, agd.area_of_expertise, agd.birth_date, agd.address, agd.bank_details
      FROM users u
      LEFT JOIN artist_group_details agd ON u.id = agd.user_id
      WHERE u.id = ? AND u.role IN ('artist', 'group')
    `,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];
    const [files] = await db.query(
      "SELECT entity_type, file_link FROM files WHERE entity_id = ?",
      [id]
    );
    const fileLinks = files.reduce(
      (acc, file) => ({ ...acc, [file.entity_type]: file.file_link }),
      {}
    );

    res.status(200).json({ ...user, ...fileLinks });
  } catch (error) {
    console.error("Erro ao buscar detalhes do usuário:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do usuário" });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `ID inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role) && req.user.id !== id) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.cpf_cnpj,
             agd.bio, agd.area_of_expertise, agd.birth_date, agd.address, agd.bank_details
      FROM users u
      LEFT JOIN artist_group_details agd ON u.id = agd.user_id
      WHERE u.id = ?
    `,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];
    const [files] = await db.query(
      "SELECT entity_type, file_link FROM files WHERE entity_id = ?",
      [id]
    );
    const fileLinks = files.reduce(
      (acc, file) => ({ ...acc, [file.entity_type]: file.file_link }),
      {}
    );

    if (typeof user.address === "string")
      user.address = JSON.parse(user.address);
    if (typeof user.bank_details === "string")
      user.bank_details = JSON.parse(user.bank_details);

    res.status(200).json({ ...user, ...fileLinks });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `ID inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [user] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (user.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(
        "DELETE FROM artist_group_details WHERE user_id = ?",
        [id]
      );
      await connection.query("DELETE FROM files WHERE entity_id = ?", [id]);
      await connection.query("DELETE FROM users WHERE id = ?", [id]);

      await connection.commit();
      res.status(200).json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ error: error.message || "Erro ao deletar usuário" });
  }
});

router.put("/:id/password", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `ID inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (!new_password) {
      return res.status(400).json({ error: "Nova senha é obrigatória" });
    }

    const [user] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (user.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      id,
    ]);

    res.status(200).json({ message: "Senha atualizada com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    res.status(500).json({ error: "Erro ao atualizar senha" });
  }
});

module.exports = router;
