// routes/auth.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    registerPelamar,
    registerHR,
    login,
    refreshToken,
    logout,
    getProfile,
    changePassword
} = require('../controllers/authController');

// POST /api/auth/register/pelamar - Register new job seeker
router.post('/register/pelamar', registerPelamar);

// POST /api/auth/register/hr - Register new HR
router.post('/register/hr', registerHR);

// POST /api/auth/login - Login user
router.post('/login', login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// POST /api/auth/logout - Logout user
router.post('/logout', logout);

// GET /api/auth/profile - Get current user profile
router.get('/profile', authenticateToken, getProfile);

// POST /api/auth/change-password - Change user password
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;