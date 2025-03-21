const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const multer = require("multer");

// Log para verificar se o arquivo de rotas está sendo acessado
router.use((req, res, next) => {
  console.log(`Recebida requisição: ${req.method} ${req.originalUrl}`);
  next();
});

// Configurar o multer para lidar com upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
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

// GET /api/users/me - Buscar detalhes do usuário logado
router.get("/me", authenticateToken, async (req, res) => {
  try {
    console.log("Executando GET /api/users/me para user ID:", req.user.id);
    const [users] = await db.query(
      `
      SELECT id, name, email, role, bio, area_of_expertise, profile_picture
      FROM users
      WHERE id = ?
    `,
      [req.user.id]
    );

    console.log("Resultado da query:", users);

    if (users.length === 0) {
      console.log("Usuário não encontrado para ID:", req.user.id);
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(200).json(users[0]);
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error);
    res.status(500).json({ error: "Erro ao buscar perfil do usuário" });
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
      const { name, bio, area_of_expertise } = req.body;
      const files = req.files;

      const profilePicture = files?.profile_picture
        ? files.profile_picture[0].buffer
        : null;

      await db.query(
        `
        UPDATE users
        SET name = ?, bio = ?, area_of_expertise = ?, profile_picture = COALESCE(?, profile_picture)
        WHERE id = ?
      `,
        [name, bio, area_of_expertise, profilePicture, req.user.id]
      );

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

    const [events] = await db.query(
      `
      SELECT e.id, e.title, e.date, ea.status
      FROM events e
      JOIN event_artists ea ON e.id = ea.event_id
      WHERE ea.artist_id = ?
    `,
      [req.user.id]
    );

    res.status(200).json(events);
  } catch (error) {
    console.error("Erro ao listar eventos do usuário:", error);
    res.status(500).json({ error: "Erro ao listar eventos do usuário" });
  }
});

// GET /api/users/artists - Listar usuários com papel "artist"
router.get("/artists", authenticateToken, async (req, res) => {
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
      const { name, email, password, role } = req.body;
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
      const portfolio = files?.portfolio ? files.portfolio[0].buffer : null;
      const video = files?.video ? files.video[0].buffer : null;
      const relatedFiles = files?.related_files
        ? files.related_files[0].buffer
        : null;

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

// GET /api/users/:id - Buscar detalhes de um usuário
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!["admin", "secretary"].includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [users] = await db.query(
      `
      SELECT id, name, email, role, created_at, bio, area_of_expertise
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
