// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const hrRoutes = require('./routes/hr');
const pelamarRoutes = require('./routes/pelamar');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
app.use('/api/admin', adminRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/pelamar', pelamarRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to STTI Career API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            hr: '/api/hr',
            pelamar: '/api/pelamar'
        },
        documentation: 'See README.md for API documentation'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }
    
    // Database errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            success: false,
            message: 'Data sudah ada'
        });
    }
    
    // Default error
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Gagal terhubung ke database. Server tidak dapat dimulai.');
            process.exit(1);
        }
        
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════╗
║           STTI Career API              ║
╠════════════════════════════════════════╣
║ Server running on port: ${PORT.toString().padEnd(15)} ║
║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)} ║
║ Database: Connected ✅                 ║
╚════════════════════════════════════════╝

Available Endpoints:
┌─────────────────────────────────────────┐
│ Authentication:                         │
│ POST /api/auth/register/pelamar         │
│ POST /api/auth/register/hr              │
│ POST /api/auth/login                    │
│ GET  /api/auth/profile                  │
├─────────────────────────────────────────┤
│ Admin (requires admin role):            │
│ GET  /api/admin/dashboard               │
│ GET  /api/admin/users                   │
│ GET  /api/admin/users/:id               │
│ PATCH /api/admin/users/:id/status       │
│ DELETE /api/admin/users/:id             │
├─────────────────────────────────────────┤
│ HR (requires hr role):                  │
│ GET  /api/hr/dashboard                  │
│ POST /api/hr/jobs                       │
│ GET  /api/hr/jobs                       │
│ PUT  /api/hr/jobs/:id                   │
│ DELETE /api/hr/jobs/:id                 │
│ GET  /api/hr/applications               │
│ PATCH /api/hr/applications/:id/status   │
├─────────────────────────────────────────┤
│ Pelamar (requires pelamar role):        │
│ GET  /api/pelamar/dashboard             │
│ GET  /api/pelamar/jobs                  │
│ GET  /api/pelamar/jobs/:id              │
│ POST /api/pelamar/applications          │
│ GET  /api/pelamar/applications          │
│ DELETE /api/pelamar/applications/:id    │
│ PUT  /api/pelamar/profile               │
└─────────────────────────────────────────┘

Default Admin Login:
Username: admin@stti.ac.id
Password: 4dm1n
            `);
        });
    } catch (error) {
        console.error('❌ Gagal memulai server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();