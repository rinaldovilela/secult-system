const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const multer = require("multer");

// Configurar o multer para lidar com upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(), // Armazenar os arquivos na memória
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite de 50MB por arquivo
  },
});

// Middleware para tratar erros do multer
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

// GET /users/artists - Listar usuários com papel "artist" (qualquer usuário autenticado pode ver)
router.get("/users/artists", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name FROM users WHERE role = "artist"'
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao listar usuários artistas:", error);
    res.status(500).json({ error: "Erro ao listar usuários artistas" });
  }
});

// POST /api/users - Cadastrar um novo artista ou grupo cultural
router.post(
  "/users",
  authenticateToken,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "portfolio", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "related_files", maxCount: 1 },
  ]),
  handleMulterError, // Adicionar o middleware de tratamento de erro
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const files = req.files;

      // Validar os dados
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes" });
      }

      // Verificar se o role é válido
      if (!["artist", "group"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Role inválido. Use 'artist' ou 'group'" });
      }

      // Verificar se o usuário é admin ou secretary
      if (!["admin", "secretary"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Verificar se o email já está em uso
      const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      // Criptografar a senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Preparar os dados dos arquivos
      const profilePicture = files?.profile_picture
        ? files.profile_picture[0].buffer
        : null;
      const portfolio = files?.portfolio ? files.portfolio[0].buffer : null;
      const video = files?.video ? files.video[0].buffer : null;
      const relatedFiles = files?.related_files
        ? files.related_files[0].buffer
        : null;

      // Inserir o novo usuário
      await db.query(
        `
        INSERT INTO users (name, email, password, role, profile_picture, portfolio, video, related_files, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [
          name,
          email,
          hashedPassword,
          role,
          profilePicture,
          portfolio,
          video,
          relatedFiles,
        ]
      );

      res.status(201).json({ message: "Usuário cadastrado com sucesso" });
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error);
      res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
  }
);

// GET /api/users/:id - Buscar detalhes de um usuário (artista ou grupo)
router.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin ou secretary
    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [users] = await db.query(
      `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = ? AND role IN ('artist', 'group')
    `,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(200).json(users[0]);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

module.exports = router;
