const bcrypt = require("bcryptjs");
const db = require("../config/db");

const seedAdmin = async () => {
  try {
    const [existingAdmin] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      ["admin@secult.com"]
    );
    if (existingAdmin.length > 0) {
      console.log("Administrador inicial já existe.");
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ["Admin Inicial", "admin@secult.com", hashedPassword, "admin"]
    );
    console.log(
      "Administrador inicial criado com sucesso! Email: admin@secult.com, Senha: admin123"
    );
  } catch (error) {
    console.error("Erro ao criar administrador inicial:", error);
  } finally {
    process.exit();
  }
};

seedAdmin();
