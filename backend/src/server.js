const express = require("express");
const cors = require("cors");
const artistRoutes = require("./routes/artistRoutes");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", artistRoutes);

app.get("/", (req, res) => {
  res.send("Backend Secult System rodando!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
