// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stti_career',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // ms, valid option
  timezone: '+07:00' // WIB timezone
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');

    const [result] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database query test passed', result);

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Pastikan MySQL server berjalan');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Username atau password database salah');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database tidak ditemukan');
    }
    return false;
  }
};

// Wrapper untuk query (agar seragam di project)
const db = {
  execute: async (query, params = []) => {
    try {
      const [result] = await pool.execute(query, params);
      return [result];
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  },
  query: async (query, params = []) => {
    try {
      const [result] = await pool.query(query, params);
      return [result];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
};

// Initialize database and create tables if needed
const initializeDatabase = async () => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const allowBootstrap = process.env.DB_BOOTSTRAP === '1';

    if (isProd && !allowBootstrap) {
      console.log('⏭️  Skipping DB bootstrap in production');
      return true;
    }

    console.log('🔧 Checking database schema...');

    // daftar tabel yang kita harapkan ada sesuai schema final
    const requiredTables = [
      'users',
      'companies',
      'hr_profiles',
      'job_posts',
      'applications',
      'bookmarks',
      'certificates',
      'job_categories',
      'job_posts_extra',
      'job_seeker_profiles',
      'job_seeker_skills',
      'job_skills',
      'notifications',
      'pelamar_profiles',
      'saved_jobs',
      'selection_phases',
      'skills',
      'work_experiences'
    ];

    // ambil semua tables
    const [rows] = await pool.query(`SELECT TABLE_NAME AS t
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()`);

    const existing = new Set(rows.map(r => r.t));
    const missing = requiredTables.filter(t => !existing.has(t));

    if (missing.length) {
      console.warn('⚠️  Missing tables:', missing.join(', '));
      console.warn('👉 Import schema.sql atau jalankan migration biar lengkap.');
      // Pilihan: throw biar fail fast di dev
      // throw new Error(`Missing required tables: ${missing.join(', ')}`);
    } else {
      console.log('✅ All required tables are present');
    }

    // Pastikan kolom verifikasi job ada (defensif kalau DB dev lama)
    const [verifCols] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='job_posts'
        AND COLUMN_NAME IN ('verification_status','verification_by','verification_at','rejection_reason')
    `);
    const haveCols = new Set(verifCols.map(c => c.COLUMN_NAME));
    if (!haveCols.has('verification_status') || !haveCols.has('verification_by') ||
        !haveCols.has('verification_at') || !haveCols.has('rejection_reason')) {
      console.warn('⚠️  job_posts verification columns incomplete on this DB.');
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

    console.log('✅ Schema check finished');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

module.exports = {
  pool,
  db,
  testConnection,
  initializeDatabase,
  execute: db.execute,
  query: db.query
};