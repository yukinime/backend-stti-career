// routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
    registerPelamar, 
    registerHR, 
    login, 
    getProfile 
} = require('../controllers/authController');
const { 
    validate, 
    registerPelamarSchema, 
    registerHRSchema, 
    loginSchema 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        success: false,
        message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.'
    }
});

// Apply rate limiting to sensitive endpoints
router.use('/login', authLimiter);
router.use('/register', authLimiter);

// Public routes
router.post('/register/pelamar', validate(registerPelamarSchema), registerPelamar);
router.post('/register/hr', validate(registerHRSchema), registerHR);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

module.exports = router;