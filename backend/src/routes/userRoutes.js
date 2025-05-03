const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cpfCnpjValidator = require("cpf-cnpj-validator");
const { cpf, cnpj } = cpfCnpjValidator;
const compression = require("compression"); // Adicionando compressão

// Cache em memória
const cache = {};
const CACHE_DURATION = 300000; // 5 minutos em milissegundos

const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Habilitar compressão para todas as rotas
router.use(compression());

router.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite de 50MB por arquivo
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
      const bankDetails =
        typeof req.body.bank_details === "string"
          ? JSON.parse(req.body.bank_details)
          : req.body.bank_details;
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

// GET /api/users/details/:id - Buscar detalhes completos de um usuário
router.get("/details/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `ID inválido: ${id}` });
    }

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    // Verificar cache
    const cacheKey = `user_details_${id}`;
    if (
      cache[cacheKey] &&
      Date.now() - cache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return res.status(200).json(cache[cacheKey].data);
    }

    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.cpf_cnpj, u.profile_picture,
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

    // Parsear JSON fields
    if (typeof user.address === "string") {
      user.address = JSON.parse(user.address);
    }
    if (typeof user.bank_details === "string") {
      user.bank_details = JSON.parse(user.bank_details);
    }

    // Converter profile_picture para Base64 de forma assíncrona
    if (user.profile_picture) {
      user.profile_picture = await new Promise((resolve) => {
        resolve(Buffer.from(user.profile_picture).toString("base64"));
      });
    }

    // Cachear resultado
    cache[cacheKey] = {
      data: user,
      timestamp: Date.now(),
    };

    // Limpar cache após o tempo de expiração
    setTimeout(() => delete cache[cacheKey], CACHE_DURATION);

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao buscar detalhes do usuário:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes do usuário" });
  }
});

// POST /api/users/register - Registro de usuário (artist ou group)
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
        `INSERT INTO users (
          id, name, email, password, role, cpf_cnpj, 
          profile_picture, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          name,
          email,
          hashedPassword,
          role,
          cpf_cnpj,
          files?.profile_picture?.[0]?.buffer || null,
        ]
      );

      if (["artist", "group"].includes(role)) {
        await connection.query(
          `INSERT INTO artist_group_details (
            user_id, bio, area_of_expertise, portfolio, 
            video, related_files, birth_date, address, bank_details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            bio,
            area_of_expertise,
            files?.portfolio?.[0]?.buffer || null,
            files?.video?.[0]?.buffer || null,
            files?.related_files?.[0]?.buffer || null,
            birth_date || null,
            JSON.stringify(address),
            JSON.stringify({
              ...bank_details,
              account_holder_name: name,
              account_holder_document: cpf_cnpj,
              account_holder_type: role === "artist" ? "individual" : "company",
            }),
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

// GET /api/users/artists - Listar artistas e grupos
router.get("/artists", authenticateToken, async (req, res) => {
  try {
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role,
             agd.bio, agd.area_of_expertise, agd.birth_date
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

// GET /api/users/me - Buscar detalhes do usuário logado
router.get("/me", authenticateToken, async (req, res) => {
  try {
    if (!isValidUUID(req.user.id)) {
      return res
        .status(400)
        .json({ error: `ID de usuário inválido: ${req.user.id}` });
    }

    const [users] = await db.query(
      `
      SELECT u.id, u.name, u.email, u.role, u.profile_picture,
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
    if (user.profile_picture) {
      user.profile_picture = Buffer.from(user.profile_picture).toString(
        "base64"
      );
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// PUT /api/users/me - Atualizar perfil do usuário logado
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

      const profilePicture = files?.profile_picture
        ? files.profile_picture[0].buffer
        : null;

      await db.query(
        `
        UPDATE users
        SET name = ?, profile_picture = COALESCE(?, profile_picture)
        WHERE id = ?
      `,
        [name, profilePicture, req.user.id]
      );

      if (["artist", "group"].includes(req.user.role)) {
        await db.query(
          `
          UPDATE artist_group_details
          SET bio = ?, area_of_expertise = ?
          WHERE user_id = ?
        `,
          [bio, area_of_expertise, req.user.id]
        );
      }

      res.status(200).json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  }
);

// GET /api/users/me/events - Listar eventos do usuário logado
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

// POST /api/users - Cadastrar um novo artista ou grupo cultural
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

      if (["artist", "group"].includes(role)) {
        if (!address || !bank_details) {
          return res.status(400).json({
            error:
              "Endereço e dados bancários são obrigatórios para artistas/grupos",
          });
        }

        const addressObj =
          typeof address === "string" ? JSON.parse(address) : address;
        if (
          !addressObj.cep ||
          !addressObj.logradouro ||
          !addressObj.numero ||
          !addressObj.bairro ||
          !addressObj.cidade ||
          !addressObj.estado
        ) {
          return res.status(400).json({
            error:
              "Endereço deve conter cep, logradouro, numero, bairro, cidade e estado",
          });
        }

        const bankDetailsObj =
          typeof bank_details === "string"
            ? JSON.parse(bank_details)
            : bank_details;
        if (
          !bankDetailsObj.bank_name ||
          !bankDetailsObj.account_type ||
          !bankDetailsObj.agency ||
          !bankDetailsObj.account_number
        ) {
          return res.status(400).json({
            error:
              "Dados bancários devem conter bank_name, account_type, agency e account_number",
          });
        }
      }

      const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const profilePicture = files?.profile_picture
        ? files.profile_picture[0].buffer
        : null;
      const userId = uuidv4();

      await db.query(
        `
        INSERT INTO users (id, name, email, password, role, cpf_cnpj, profile_picture, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [userId, name, email, hashedPassword, role, cpf_cnpj, profilePicture]
      );

      if (["artist", "group"].includes(role)) {
        const portfolio = files?.portfolio ? files.portfolio[0].buffer : null;
        const video = files?.video ? files.video[0].buffer : null;
        const relatedFiles = files?.related_files
          ? files.related_files[0].buffer
          : null;

        await db.query(
          `
          INSERT INTO artist_group_details (user_id, bio, area_of_expertise, portfolio, video, related_files, birth_date, address, bank_details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            userId,
            bio,
            area_of_expertise,
            portfolio,
            video,
            relatedFiles,
            birth_date || null,
            JSON.stringify(addressObj),
            JSON.stringify(bankDetailsObj),
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

// PUT /api/users/:id - Atualizar um usuário específico (apenas admin ou secretary)
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
  validateArtistData,
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

      const [users] = await db.query(
        `
        SELECT u.id, u.name, u.email, u.role, u.cpf_cnpj,
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

      const existingUser = users[0];
      const existingAddress =
        typeof existingUser.address === "string"
          ? JSON.parse(existingUser.address)
          : existingUser.address;
      const existingBankDetails =
        typeof existingUser.bank_details === "string"
          ? JSON.parse(existingUser.bank_details)
          : existingUser.bank_details;

      let updatedName = name || existingUser.name;
      let updatedEmail = email || existingUser.email;
      let updatedRole = role || existingUser.role;
      let updatedCpfCnpj = cpf_cnpj || existingUser.cpf_cnpj;

      if (email) {
        const [existingEmail] = await db.query(
          "SELECT * FROM users WHERE email = ? AND id != ?",
          [email, id]
        );
        if (existingEmail.length > 0) {
          return res.status(400).json({ error: "Email já está em uso" });
        }
      }

      if (cpf_cnpj && !cpf.isValid(cpf_cnpj) && !cnpj.isValid(cpf_cnpj)) {
        return res.status(400).json({ error: "CPF ou CNPJ inválido" });
      }

      if (role && !["artist", "group"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Role inválido. Use 'artist' ou 'group'" });
      }

      const profilePicture = files?.profile_picture
        ? files.profile_picture[0].buffer
        : null;
      const portfolio = files?.portfolio ? files.portfolio[0].buffer : null;
      const video = files?.video ? files.video[0].buffer : null;
      const relatedFiles = files?.related_files
        ? files.related_files[0].buffer
        : null;

      await db.query(
        `
        UPDATE users
        SET name = ?, email = ?, role = ?, cpf_cnpj = ?, profile_picture = COALESCE(?, profile_picture)
        WHERE id = ?
      `,
        [
          updatedName,
          updatedEmail,
          updatedRole,
          updatedCpfCnpj,
          profilePicture,
          id,
        ]
      );

      if (["artist", "group"].includes(updatedRole)) {
        const addressObj = address || existingAddress;
        const bankDetailsObj = bank_details || existingBankDetails;

        const [existingDetails] = await db.query(
          "SELECT * FROM artist_group_details WHERE user_id = ?",
          [id]
        );

        if (existingDetails.length > 0) {
          await db.query(
            `
            UPDATE artist_group_details
            SET bio = COALESCE(?, bio),
                area_of_expertise = COALESCE(?, area_of_expertise),
                portfolio = COALESCE(?, portfolio),
                video = COALESCE(?, video),
                related_files = COALESCE(?, related_files),
                birth_date = COALESCE(?, birth_date),
                address = ?,
                bank_details = ?
            WHERE user_id = ?
          `,
            [
              bio,
              area_of_expertise,
              portfolio,
              video,
              relatedFiles,
              birth_date,
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
          if (!addressObj || !bankDetailsObj) {
            return res.status(400).json({
              error:
                "Endereço e dados bancários são obrigatórios para artistas/grupos",
            });
          }
          await db.query(
            `
            INSERT INTO artist_group_details (user_id, bio, area_of_expertise, portfolio, video, related_files, birth_date, address, bank_details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              id,
              bio,
              area_of_expertise,
              portfolio,
              video,
              relatedFiles,
              birth_date || null,
              JSON.stringify(addressObj),
              JSON.stringify(bankDetailsObj),
            ]
          );
        }
      }

      // Invalidar cache após atualização
      const cacheKey = `user_details_${id}`;
      delete cache[cacheKey];

      res.status(200).json({ message: "Usuário atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  }
);

// GET /api/users/:id - Buscar detalhes de um usuário
router.get("/:id", authenticateToken, async (req, res) => {
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
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.cpf_cnpj, u.profile_picture,
             agd.bio, agd.area_of_expertise, agd.portfolio, agd.video, 
             agd.related_files, agd.birth_date, agd.address, agd.bank_details
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

    if (user.profile_picture) {
      user.profile_picture = Buffer.from(user.profile_picture).toString(
        "base64"
      );
    }
    if (user.portfolio) {
      user.portfolio = Buffer.from(user.portfolio).toString("base64");
    }
    if (user.video) {
      user.video = Buffer.from(user.video).toString("base64");
    }
    if (user.related_files) {
      user.related_files = Buffer.from(user.related_files).toString("base64");
    }

    if (typeof user.address === "string") {
      user.address = JSON.parse(user.address);
    }
    if (typeof user.bank_details === "string") {
      user.bank_details = JSON.parse(user.bank_details);
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// DELETE /api/users/:id - Deletar um usuário específico (apenas admin ou secretary)
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
      const [result] = await connection.query(
        "DELETE FROM users WHERE id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        throw new Error("Nenhum usuário foi deletado");
      }

      await connection.commit();
      const cacheKey = `user_details_${id}`;
      delete cache[cacheKey];
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

// PUT /api/users/:id/password - Alterar senha do usuário (apenas admin ou secretary)
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

// PUT /api/users/:id/file/:type - Atualizar arquivo específico do usuário
router.put(
  "/:id/file/:type",
  authenticateToken,
  upload.single("file"),
  handleMulterError,
  async (req, res) => {
    try {
      const { id, type } = req.params;

      if (!isValidUUID(id)) {
        return res.status(400).json({ error: `ID inválido: ${id}` });
      }

      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const validTypes = [
        "profile_picture",
        "portfolio",
        "video",
        "related_files",
      ];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Tipo de arquivo inválido" });
      }

      const [user] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
      if (user.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      if (type === "profile_picture") {
        await db.query(
          `
          UPDATE users
          SET profile_picture = ?
          WHERE id = ?
        `,
          [file.buffer, id]
        );
      } else {
        const [existingDetails] = await db.query(
          "SELECT * FROM artist_group_details WHERE user_id = ?",
          [id]
        );

        if (existingDetails.length === 0) {
          return res
            .status(404)
            .json({ error: "Detalhes do artista/grupo não encontrados" });
        }

        await db.query(
          `
          UPDATE artist_group_details
          SET ${type} = ?
          WHERE user_id = ?
        `,
          [file.buffer, id]
        );
      }

      const cacheKey = `user_details_${id}`;
      delete cache[cacheKey];

      res.status(200).json({ message: `${type} atualizado com sucesso` });
    } catch (error) {
      console.error(`Erro ao atualizar ${type}:`, error);
      res.status(500).json({ error: `Erro ao atualizar ${type}` });
    }
  }
);

module.exports = router;
