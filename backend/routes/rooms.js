const express = require("express");
const fs      = require("fs");
const path    = require("path");
const { pool } = require("../db.js");
const upload   = require("../upload.js");

const router = express.Router();

// GET /api/rooms/:roomId
router.get("/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const result = await pool.query(
      "SELECT * FROM rooms WHERE room_id = $1", [roomId]
    );
    if (result.rows.length === 0) {
      return res.json({ room_id: Number(roomId), images: [], description: "", amenities: [], address: "", phone: "" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// GET /api/rooms
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rooms ORDER BY room_id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// POST /api/rooms/:roomId/info
router.post("/:roomId/info", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { description = "", amenities = [], address = "", phone = "" } = req.body;
    const result = await pool.query(`
      INSERT INTO rooms (room_id, description, amenities, address, phone, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (room_id) DO UPDATE SET
        description = EXCLUDED.description,
        amenities   = EXCLUDED.amenities,
        address     = EXCLUDED.address,
        phone       = EXCLUDED.phone,
        updated_at  = NOW()
      RETURNING *
    `, [roomId, description, amenities, address, phone]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// POST /api/rooms/:roomId/images
router.post("/:roomId/images", upload.array("images", 5), async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Không có file nào được upload" });
    }
    const newUrls = req.files.map(f => `/uploads/${f.filename}`);
    const result = await pool.query(`
      INSERT INTO rooms (room_id, images, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (room_id) DO UPDATE SET
        images     = array_cat(rooms.images, EXCLUDED.images),
        updated_at = NOW()
      RETURNING *
    `, [roomId, newUrls]);
    res.json({ message: "Upload thành công", room: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi upload" });
  }
});

// DELETE /api/rooms/:roomId/images
router.delete("/:roomId/images", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: "Thiếu filename" });
    const urlToRemove = `/uploads/${filename}`;
    const result = await pool.query(`
      UPDATE rooms
      SET images = array_remove(images, $1), updated_at = NOW()
      WHERE room_id = $2
      RETURNING *
    `, [urlToRemove, roomId]);
    const filePath = path.join(process.env.UPLOAD_DIR || "uploads", filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ message: "Đã xóa ảnh", room: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi xóa ảnh" });
  }
});

module.exports = router;