const express = require("express");
const cors    = require("cors");
const path    = require("path");
require("dotenv").config();

const { initDB } = require("./db");
const roomRoutes = require("./routes/rooms");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors({ origin: "http://localhost:5173" })); // Vite dev server
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve ảnh tĩnh
app.use("/uploads", express.static(path.join(__dirname, process.env.UPLOAD_DIR || "uploads")));

// ── Routes ──
app.use("/api/rooms", roomRoutes);

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

// ── Start ──
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend chạy tại http://localhost:${PORT}`);
    console.log(`📁 Ảnh phục vụ tại http://localhost:${PORT}/uploads`);
  });
}).catch(err => {
  console.error("❌ Không thể kết nối DB:", err.message);
  process.exit(1);
});