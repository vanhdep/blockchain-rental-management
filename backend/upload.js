const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
require("dotenv").config();

const UPLOAD_DIR    = process.env.UPLOAD_DIR    || "uploads";
const MAX_SIZE_MB   = process.env.MAX_FILE_SIZE_MB || 5;

// Tạo thư mục upload nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `room_${req.params.roomId}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext     = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Chỉ cho phép file ảnh JPG, PNG, WEBP"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;