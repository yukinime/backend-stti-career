// config/database.js
const mysql = require("mysql2/promise");
const dns = require("dns");
require("dotenv").config();

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const host = process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || "localhost";
const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306);
const user = process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || "root";
const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || "";
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || "stti_career";

// Set true kalau provider kamu mewajibkan SSL (default false untuk Railway)
const useSSL = process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true";
const ssl = useSSL ? { rejectUnauthorized: false } : undefined;

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000,
  timezone: "+07:00",
  ...(ssl ? { ssl } : {}),
});

// Retryable test
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const testConnection = async (retries = 8, delayMs = 1500) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log("✅ Database connected successfully");
      return true;
    } catch (error) {
      console.error(`❌ Database connection failed (attempt ${i}/${retries}):`, error.message);
      if (i === retries) return false;
      await sleep(delayMs);
    }
  }
  return false;
};

const db = {
  execute: async (q, p = []) => {
    const [result] = await pool.execute(q, p);
    return [result];
  },
  query: async (q, p = []) => {
    const [result] = await pool.query(q, p);
    return [result];
  },
};

// Initialize database and create tables if needed
const initializeDatabase = async () => {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const allowBootstrap = process.env.DB_BOOTSTRAP === "1";

    if (isProd && !allowBootstrap) {
      console.log("⏭️  Skipping DB bootstrap in production");
      return true;
    }

    console.log("🔧 Checking database schema...");

    // daftar tabel yang kita harapkan ada sesuai schema final
    const requiredTables = [
      "users",
      "companies",
      "hr_profiles",
      "job_posts",
      "applications",
      "bookmarks",
      "certificates",
      "job_categories",
      "job_posts_extra",
      "job_seeker_profiles",
      "job_seeker_skills",
      "job_skills",
      "notifications",
      "pelamar_profiles",
      "saved_jobs",
      "selection_phases",
      "skills",
      "work_experiences",
    ];

    // ambil semua tables
    const [rows] = await pool.query(`SELECT TABLE_NAME AS t
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()`);

    const existing = new Set(rows.map((r) => r.t));
    const missing = requiredTables.filter((t) => !existing.has(t));

    if (missing.length) {
      console.warn("⚠️  Missing tables:", missing.join(", "));
      console.warn("👉 Import schema.sql atau jalankan migration biar lengkap.");
      // Pilihan: throw biar fail fast di dev
      // throw new Error(`Missing required tables: ${missing.join(', ')}`);
    } else {
      console.log("✅ All required tables are present");
    }

    // Pastikan kolom verifikasi job ada (defensif kalau DB dev lama)
    const [verifCols] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='job_posts'
        AND COLUMN_NAME IN ('verification_status','verification_by','verification_at','rejection_reason')
    `);
    const haveCols = new Set(verifCols.map((c) => c.COLUMN_NAME));
    if (!haveCols.has("verification_status") || !haveCols.has("verification_by") || !haveCols.has("verification_at") || !haveCols.has("rejection_reason")) {
      console.warn("⚠️  job_posts verification columns incomplete on this DB.");
      console.warn("👉 Jalankan ALTER TABLE sesuai patch yang sudah kita apply sebelumnya.");
    }

    // Buat admin_activity_logs jika belum ada (aman & berguna di semua env)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id INT NOT NULL,
        action ENUM('verify_job','reject_job','activate_user','deactivate_user','delete_user') NOT NULL,
        target_type ENUM('job_post','user') NOT NULL,
        target_id INT NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_logs_created (created_at),
        CONSTRAINT fk_admin_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("✅ Schema check finished");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return false;
  }
};

module.exports = {
  pool,
  db,
  testConnection,
  initializeDatabase, // kalau kamu pisah; kalau tidak, ekspor yang ada
  execute: db.execute,
  query: db.query,
};
