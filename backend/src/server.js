const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const artistRoutes = require("./routes/artistRoutes");
const eventRoutes = require("./routes/eventRoutes");
const userRoutes = require("./routes/userRoutes"); // Adicione esta linha

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);

app.use("/api", eventRoutes);
app.use("/api", userRoutes); // Adicione esta linha

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Backend Secult System rodando!");
});
