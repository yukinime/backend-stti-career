// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // hanya untuk deteksi error Multer di error handler

const { testConnection, initializeDatabase } = require('./config/database');
// >>> Single source of truth (semua path upload ikut ini)
const {
  UPLOADS_BASE,
  IMAGES_DIR,
  FILES_DIR,
  COMPANY_LOGOS_DIR
} = require('./config/paths');

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const bookmarkRoutes = require('./routes/bookmarks');
const jobRoutes = require('./routes/jobs');
const applicantRoutes = require('./routes/applicant');
const companyRoutes = require('./routes/company');
const adminRoutes = require('./routes/admin'); // aktifkan jika ada

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || '1.0.0';

// Trust proxy (Cloud/Reverse proxy)
app.set('trust proxy', 1);

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true,
  credentials: true
};
app.use(cors(corsOptions));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger sederhana
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Pastikan folder upload tersedia
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(UPLOADS_BASE);
ensureDir(IMAGES_DIR);
ensureDir(FILES_DIR);
ensureDir(COMPANY_LOGOS_DIR);

// Serve /uploads dengan CORS & cache panjang
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  },
  express.static(UPLOADS_BASE, { index: false, dotfiles: 'ignore' })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'STTI Career API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applicant', applicantRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/admin', adminRoutes);

// Root
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to STTI Career API',
    version: VERSION,
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      bookmarks: '/api/bookmarks',
      jobs: '/api/jobs',
      company: '/api/company',
      applicant: '/api/applicant',
      admin: '/api/admin'
    },
    documentation: 'See README.md for API documentation'
  });
});

// Error handler (global)
app.use((err, req, res, _next) => {
  console.error('Error details:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user
  });

  // Multer errors
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: 'File terlalu besar (maksimal 5MB)',
      LIMIT_FILE_COUNT: 'Terlalu banyak file yang diupload',
      LIMIT_UNEXPECTED_FILE: 'Field file tidak dikenali'
    };
    return res.status(400).json({ success: false, message: map[err.code] || 'Upload error' });
  }

  if (err.message === 'File type not allowed' || /Tipe file tidak diizinkan/i.test(err.message)) {
    return res.status(400).json({
      success: false,
      message: 'Tipe file tidak diizinkan.'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token sudah kadaluarsa' });
  }

  // DB errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ success: false, message: 'Data sudah ada' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'Data referensi tidak ditemukan' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ success: false, message: 'Data tidak dapat dihapus karena masih digunakan' });
  }
  if (err.code === 'ECONNREFUSED') {
    return res.status(500).json({ success: false, message: 'Gagal terhubung ke database' });
  }

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan server',
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    requested_endpoint: req.originalUrl,
    available_endpoints: [
      '/api/auth/*',
      '/api/profile/*',
      '/api/bookmarks/*',
      '/api/company/*',
      '/api/applicant/*',
      '/api/jobs/*',
      '/api/admin/*'
    ]
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting STTI Career API...');
    console.log('📋 Loading environment variables...');

    const requiredEnv = ['JWT_SECRET', 'DB_NAME'];
    const missing = requiredEnv.filter((k) => !process.env[k]);
    if (missing.length) {
      console.error('❌ Missing required env:', missing.join(', '));
      process.exit(1);
    }

    console.log('🔌 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Gagal terhubung ke database. Stop.');
      process.exit(1);
    }

    console.log('🔧 Initializing database tables...');
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('❌ Gagal menginisialisasi database tables.');
      process.exit(1);
    }

    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║           STTI Career API              ║
╠════════════════════════════════════════╣
║ Server running on port: ${PORT.toString().padEnd(15)}║
║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)}       ║
║ Database: Connected ✅                 ║
║ Tables: Initialized ✅                 ║
║ File Upload: Enabled ✅                ║
╚════════════════════════════════════════╝

🌐 Server URL: http://localhost:${PORT}
📡 Health Check: http://localhost:${PORT}/health
📁 File Access: http://localhost:${PORT}/uploads/
      `);
      console.log('📁 Uploads base dir:', UPLOADS_BASE);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        console.log('✅ Server closed successfully');
        console.log('👋 Goodbye!');
        process.exit(0);
      });
      setTimeout(() => {
        console.log('❌ Force shutdown');
        process.exit(1);
      }, 30000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (e) => {
      console.error('❌ Uncaught Exception:', e);
      gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (r, p) => {
      console.error('❌ Unhandled Rejection at:', p, 'reason:', r);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    console.error('❌ Gagal memulai server:', error);
    console.error('   Detail error:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`   Port ${PORT} sudah digunakan. Coba port lain.`);
    }
    process.exit(1);
  }
};

startServer();
