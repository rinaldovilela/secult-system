const express = require("express");
const cors = require("cors");
const artistRoutes = require("./routes/artistRoutes");
const eventRoutes = require("./routes/eventRoutes");
const authRoutes = require("./routes/authRoutes");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", artistRoutes);
app.use("/api", eventRoutes);
app.use("/api", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend Secult System rodando!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
