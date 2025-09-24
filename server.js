// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const bookmarkRoutes = require('./routes/bookmarks');
const jobRoutes = require('./routes/jobs');
const applicantRoutes = require('./routes/applicant');
const companyRoutes = require('./routes/company');
const adminRoutes = require('./routes/admin'); // ✅ aktifkan admin

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || '1.0.0';

// Trust proxy (Railway/Reverse proxy)
app.set('trust proxy', 1);

// CORS (aman untuk credentials)
const corsOptions = {
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true, // reflect request origin
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Simple request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

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
app.use('/api/admin', adminRoutes); // ✅ mount admin

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

// Error handler
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

  if (err.message === 'File type not allowed') {
    return res.status(400).json({
      success: false,
      message: 'Tipe file tidak diizinkan. Hanya diperbolehkan: JPG, PNG, PDF, DOC, DOCX'
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

const path = require('path');
const fs = require('fs');

app.set('trust proxy', 1); // penting agar x-forwarded-proto terbaca jadi https di Railway

const uploadsBase = path.resolve(__dirname, 'uploads');
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(path.join(uploadsBase, 'images'));
ensureDir(path.join(uploadsBase, 'files'));

// Sajikan /uploads sebagai file statis publik (+CORS + cache)
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // agar gambar bisa di-load dari FE domain manapun
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // cache panjang utk static
    next();
  },
  express.static(uploadsBase, { index: false, dotfiles: 'ignore' })
);

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

// Start
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

    // Initialize (dev only / or if DB_BOOTSTRAP=1)
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

Available Endpoints:
┌─────────────────────────────────────────┐
│ 🔐 Authentication:                      │
│ POST /api/auth/register/pelamar         │
│ POST /api/auth/register/hr              │
│ POST /api/auth/login                    │
│ GET  /api/auth/profile                  │
│ POST /api/auth/refresh                  │
│ POST /api/auth/logout                   │
│ POST /api/auth/change-password          │
├─────────────────────────────────────────┤
│ 👤 Profile Management (Pelamar):        │
│ GET  /api/profile                       │
│ PUT  /api/profile/biodata               │
│ PUT  /api/profile/education             │
│ POST /api/profile/work-experience       │
│ PUT  /api/profile/work-experience/:id   │
│ DEL  /api/profile/work-experience/:id   │
│ POST /api/profile/certificate           │
│ PUT  /api/profile/certificate/:id       │
│ DEL  /api/profile/certificate/:id       │
│ POST /api/profile/skill                 │
│ PUT  /api/profile/skill/:id             │
│ DEL  /api/profile/skill/:id             │
│ POST /api/profile/upload-files          │
│ POST /api/profile/upload-photo          │
├─────────────────────────────────────────┤
│ 🔖 Bookmark Management (Pelamar):       │
│ GET  /api/bookmarks                     │
│ POST /api/bookmarks                     │
│ DEL  /api/bookmarks/:id                 │
│ DEL  /api/bookmarks/job/:job_id         │
│ GET  /api/bookmarks/check/:job_id       │
│ GET  /api/bookmarks/stats               │
│ GET  /api/bookmarks/search              │
├─────────────────────────────────────────┤
│ 💼 Jobs:                                │
│ GET  /api/jobs                          │
│ GET  /api/jobs/loker/summary            │
│ GET  /api/jobs/details/:id              │
│ GET  /api/jobs/:id                      │
│ POST /api/jobs                          │
│ PUT  /api/jobs/:id                      │
│ DEL  /api/jobs/:id                      │
│ PUT  /api/jobs/:id/verify               │
├─────────────────────────────────────────┤
│ 🧑 Applicant:                           │
│ GET  /api/applicant                     │
│ GET  /api/applicant/:id                 │
│ POST /api/applicant                     │
│ PUT  /api/applicant/:id/status          │
│ DEL  /api/applicant/:id                 │
├─────────────────────────────────────────┤
│ 🏢 Company:                             │
│ GET  /api/company                       │
│ GET  /api/company/:id                   │
│ POST /api/company                       │
│ PUT  /api/company/:id                   │
│ DEL  /api/company/:id                   │
├─────────────────────────────────────────┤
│ 👨‍💼 Admin:                              │
│ GET  /api/admin/dashboard               │
│ GET  /api/admin/logs                    │
└─────────────────────────────────────────┘
      `);
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
