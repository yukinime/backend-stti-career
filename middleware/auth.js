// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        console.log('Auth header:', authHeader); // Debug log
        console.log('Extracted token:', token ? 'Token present' : 'No token'); // Debug log

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token akses diperlukan'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded); // Debug log

        // Optional: Verify user still exists and is active
        const [users] = await db.execute(
            'SELECT id, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'User tidak ditemukan atau tidak aktif'
            });
        }

        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };

        console.log('Authenticated user:', req.user); // Debug log
        next();

    } catch (error) {
        console.error('JWT verification error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token sudah kadaluarsa'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Token tidak valid'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Gagal memverifikasi token'
        });
    }
};

const requireRole = (requiredRole) => {
    return (req, res, next) => {
        console.log('Required role:', requiredRole, 'User role:', req.user?.role); // Debug log
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User tidak terautentikasi'
            });
        }

        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Diperlukan role: ${requiredRole}`
            });
        }
        
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};