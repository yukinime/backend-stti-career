// middleware/auth.js
const jwt = require('jsonwebtoken');
// kita pakai helper execute agar simple, sesuai config/database.js
const { execute } = require('../config/database');

/**
 * Autentikasi JWT dengan toleransi jam & cek user aktif (opsional)
 */
const authenticateToken = async (req, res, next) => {
  // Ambil token dari header (support Bearer xxx atau langsung token)
  const raw = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token akses diperlukan' });
  }

  try {
    // Toleransi 15 detik untuk skew waktu
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { clockTolerance: 15 });

    // Opsional: cek user aktif di DB (default: on). Set AUTH_CHECK_DB=0 kalau mau skip.
    if (process.env.AUTH_CHECK_DB !== '0') {
      const [rows] = await execute(
        'SELECT id, email, role, is_active FROM users WHERE id = ? LIMIT 1',
        [decoded.id]
      );

      if (!rows.length || rows[0].is_active !== 1) {
        return res.status(403).json({
          success: false,
          message: 'User tidak ditemukan atau tidak aktif',
        });
      }

      // Sinkronkan role/email dari DB (kalau berubah)
      req.user = { id: rows[0].id, email: rows[0].email, role: rows[0].role };
    } else {
      // Tanpa cek DB, pakai payload token
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    }

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token sudah kadaluarsa', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid', code: 'TOKEN_INVALID' });
  }
};

/**
 * Guard role: bisa multi-role -> requireRole('admin','hr')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
  }
  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`,
    });
  }
  next();
};

// Alias lama biar kompatibel
const isAdmin = requireRole('admin');
const isHR = requireRole('hr');
const isPelamar = requireRole('pelamar');

module.exports = {
  authenticateToken,
  requireRole,
  isAdmin,
  isHR,
  isPelamar,
};
