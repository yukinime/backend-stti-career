// middleware/auth.js
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT Token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists and is active
        const [users] = await pool.execute(
            'SELECT id, full_name, email, role, is_active FROM users WHERE id = ? AND is_active = true',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or user not found'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Role-based authorization
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions'
            });
        }

        next();
    };
};

// Check if user is admin
const isAdmin = authorizeRole('admin');

// Check if user is HR
const isHR = authorizeRole('hr', 'admin');

// Check if user is Pelamar
const isPelamar = authorizeRole('pelamar', 'admin');

module.exports = {
    authenticateToken,
    authorizeRole,
    isAdmin,
    isHR,
    isPelamar
};