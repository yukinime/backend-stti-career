// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Middleware untuk autentikasi JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // format: Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token akses diperlukan'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Opsional: cek apakah user masih ada & aktif
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

/**
 * Middleware generator untuk cek role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
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

// Shortcut alias biar gampang dipakai di routes
const isAdmin = requireRole('admin');
const isHR = requireRole('hr');
const isPelamar = requireRole('pelamar');

module.exports = {
  authenticateToken,
  requireRole,
  isAdmin,
  isHR,
  isPelamar
};
