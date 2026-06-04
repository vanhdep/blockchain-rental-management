const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "nha_tro_db",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "password",
});

// Tạo bảng nếu chưa có
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id       INTEGER PRIMARY KEY,   -- khớp với roomId trên blockchain
      images        TEXT[],                -- mảng URL ảnh
      description   TEXT,
      amenities     TEXT[],               -- ["WiFi", "Điều hòa", "WC riêng", ...]
      address       TEXT,
      phone         VARCHAR(20),
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Database ready");
};

module.exports = { pool, initDB };