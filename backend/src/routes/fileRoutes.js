const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const isValidUUID = (uuid) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

router.get("/admin/list", async (req, res) => {
  try {
    const [files] = await db.query(
      "SELECT f.*, d.account_name FROM files f JOIN drives d ON f.drive_account = d.id WHERE f.deleted_at IS NULL"
    );
    res.json(files);
  } catch (error) {
    console.error("[GET /admin/list] Erro:", error);
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

module.exports = router;
