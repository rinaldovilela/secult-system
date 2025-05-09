const multer = require("multer");

// Configuração de armazenamento temporário em memória
const storage = multer.memoryStorage();

// Tipos de arquivo permitidos por categoria
const ALLOWED_TYPES = {
  payment_proof: ["image/jpeg", "image/png", "application/pdf"],
  report: ["image/jpeg", "image/png", "application/pdf", "video/mp4"],
  user: ["image/jpeg", "image/png", "application/pdf", "video/mp4"],
};

// Limites de tamanho por categoria (em bytes)
const SIZE_LIMITS = {
  payment_proof: 10 * 1024 * 1024, // 10MB
  report: 10 * 1024 * 1024, // 10MB
  user: 50 * 1024 * 1024, // 50MB
};

// Middleware de validação de arquivo
const fileValidation = (fieldName, category = "user") => {
  const upload = multer({
    storage,
    limits: { fileSize: SIZE_LIMITS[category] || SIZE_LIMITS.user },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ALLOWED_TYPES[category] || ALLOWED_TYPES.user;
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Tipo de arquivo não permitido para ${fieldName}. Tipos permitidos: ${allowedTypes.join(", ")}`
          ),
          false
        );
      }
    },
  });

  // Suporta um único arquivo ou múltiplos campos
  if (Array.isArray(fieldName)) {
    return upload.fields(fieldName.map((name) => ({ name, maxCount: 1 })));
  }
  return upload.single(fieldName);
};

// Middleware para lidar com erros do multer
const checkFileLimit = (req, res, next) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }
    next();
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: `Arquivo muito grande. O limite é ${SIZE_LIMITS[req.fileCategory] / (1024 * 1024)}MB.`,
        });
      }
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

module.exports = { fileValidation, checkFileLimit };
