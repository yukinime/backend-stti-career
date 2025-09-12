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
const bookmarkRoutes = require('./routes/bookmarks'); // Updated route name
// Uncomment when ready to use
// const adminRoutes = require('./routes/admin');
// const hrRoutes = require('./routes/hr');
// const pelamarRoutes = require('./routes/pelamar');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.user) {
        console.log(`  User: ${req.user.email} (${req.user.role})`);
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
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
app.use('/api/bookmarks', bookmarkRoutes); // Updated route path

// Uncomment when other routes are ready
// app.use('/api/admin', adminRoutes);
// app.use('/api/hr', hrRoutes);
// app.use('/api/pelamar', pelamarRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to STTI Career API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            profile: '/api/profile',
            bookmarks: '/api/bookmarks', // Updated endpoint
            // admin: '/api/admin',
            // hr: '/api/hr',
            // pelamar: '/api/pelamar'
        },
        documentation: 'See README.md for API documentation'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
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
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File terlalu besar (maksimal 5MB)'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Terlalu banyak file yang diupload'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Field file tidak dikenali'
            });
        }
    }
    
    if (err.message === 'File type not allowed') {
        return res.status(400).json({
            success: false,
            message: 'Tipe file tidak diizinkan. Hanya diperbolehkan: JPG, PNG, PDF, DOC, DOCX'
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token sudah kadaluarsa'
        });
    }
    
    // Database errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            success: false,
            message: 'Data sudah ada'
        });
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Data referensi tidak ditemukan'
        });
    }
    
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({
            success: false,
            message: 'Data tidak dapat dihapus karena masih digunakan'
        });
    }
    
    if (err.code === 'ECONNREFUSED') {
        return res.status(500).json({
            success: false,
            message: 'Gagal terhubung ke database'
        });
    }
    
    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Data tidak valid',
            errors: err.details || err.message
        });
    }
    
    // Default error
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        ...(process.env.NODE_ENV === 'development' && { 
            error: err.message,
            stack: err.stack 
        })
    });
});

// Handle 404 - Not Found
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan',
        requested_endpoint: req.originalUrl,
        available_endpoints: [
            '/api/auth/*',
            '/api/profile/*',
            '/api/bookmarks/*', // Updated endpoint
            // '/api/admin/*',
            // '/api/hr/*',
            // '/api/pelamar/*'
        ]
    });
});

// Start server function
const startServer = async () => {
    try {
        console.log('🚀 Starting STTI Career API...');
        console.log('📋 Loading environment variables...');
        
        // Validate required environment variables
        const requiredEnvVars = ['JWT_SECRET', 'DB_NAME'];
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        
        if (missingEnvVars.length > 0) {
            console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
            console.error('   Please check your .env file');
            process.exit(1);
        }
        
        console.log('🔌 Testing database connection...');
        
        // Test database connection
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Gagal terhubung ke database. Server tidak dapat dimulai.');
            console.error('   Pastikan database MySQL berjalan dan konfigurasi benar.');
            process.exit(1);
        }
        
        // Initialize database tables
        console.log('🔧 Initializing database tables...');
        const dbInitialized = await initializeDatabase();
        
        if (!dbInitialized) {
            console.error('❌ Gagal menginisialisasi database tables.');
            process.exit(1);
        }
        
        // Start the server
        const server = app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════╗
║           STTI Career API              ║
╠════════════════════════════════════════╣
║ Server running on port: ${PORT.toString().padEnd(15)} ║
║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)} ║
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
└─────────────────────────────────────────┘

📂 Upload Directories:
   📄 ./uploads/files/ - Documents (PDF, DOC, DOCX)
   🖼️  ./uploads/images/ - Images (JPG, PNG, GIF)

🔑 Test User Credentials:
   Create using: POST /api/auth/register/pelamar
   Login using: POST /api/auth/login

📋 Supported File Types:
   📄 Documents: PDF, DOC, DOCX, TXT
   🖼️  Images: JPG, JPEG, PNG, GIF
   📦 Max Size: 5MB per file

🚀 API is ready to use!

Environment Variables Loaded:
   JWT_SECRET: ✅ Set
   DB_HOST: ${process.env.DB_HOST || 'localhost'}
   DB_USER: ${process.env.DB_USER || 'root'}
   DB_NAME: ${process.env.DB_NAME}
   PORT: ${PORT}

💡 Quick Test Commands:

📝 Register new pelamar:
   curl -X POST http://localhost:${PORT}/api/auth/register/pelamar \\
     -H "Content-Type: application/json" \\
     -d '{"full_name":"Test User","email":"test@example.com","password":"password123"}'

🔐 Login:
   curl -X POST http://localhost:${PORT}/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{"email":"test@example.com","password":"password123"}'

🔖 Add bookmark (need JWT token from login):
   curl -X POST http://localhost:${PORT}/api/bookmarks \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
     -d '{"job_id": 1}'

📋 Get bookmarks:
   curl -X GET http://localhost:${PORT}/api/bookmarks \\
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

🔍 Check bookmark status:
   curl -X GET http://localhost:${PORT}/api/bookmarks/check/1 \\
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

📊 Get bookmark stats:
   curl -X GET http://localhost:${PORT}/api/bookmarks/stats \\
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
            `);
        });

        // Graceful shutdown handlers
        const gracefulShutdown = (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            
            server.close(() => {
                console.log('✅ Server closed successfully');
                console.log('👋 Goodbye!');
                process.exit(0);
            });

            // Force close after 30 seconds
            setTimeout(() => {
                console.log('❌ Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };

        // Handle different termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

    } catch (error) {
        console.error('❌ Gagal memulai server:', error);
        console.error('   Detail error:', error.message);
        
        if (error.code === 'EADDRINUSE') {
            console.error(`   Port ${PORT} sudah digunakan. Coba gunakan port lain.`);
        }
        
        process.exit(1);
    }
};

// Initialize server
startServer();