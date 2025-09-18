// controllers/adminController.js
const { db } = require('../config/database');

/**
 * Get all users (with pagination, role filter, search)
 */
const getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, role, search, email, format, single } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];
    const countParams = [];

    if (role && ['admin', 'hr', 'pelamar'].includes(role)) {
      where += ' AND role = ?';
      params.push(role); countParams.push(role);
    }

    if (email) {
      where += ' AND LOWER(email) = LOWER(?)';
      params.push(email); countParams.push(email);
    }

    if (search) {
      where += ' AND (full_name LIKE ? OR email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s); countParams.push(s, s);
    }

    const listSql = `
      SELECT id, full_name, email, role, company_name, company_address, position,
             address, date_of_birth, phone, is_active, created_at, updated_at
      FROM users
      ${where}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM users
      ${where}
    `;

    const [users] = await db.query(listSql, params);        // ← db.query (text protocol)
    const [totalRows] = await db.query(countSql, countParams);
    const total = totalRows[0]?.total ?? 0;

    if (format === 'single' || single === '1' || limit === 1) {
      if (!users.length) {
        return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      }
      return res.json({ success: true, data: users[0] });
    }

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/**
 * Get single user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      `SELECT id, full_name, email, role, company_name, company_address, position, 
              address, date_of_birth, phone, is_active, created_at, updated_at 
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const user = users[0];

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id && !is_active) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menonaktifkan akun sendiri'
      });
    }

    // Update user status
    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active, id]
    );

    // Log action
    await pool.execute(
      'INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, is_active ? 'activate_user' : 'deactivate_user', 'user', id, null]
    );

    res.json({
      success: true,
      message: `User ${is_active ? 'diaktifkan' : 'dinonaktifkan'} berhasil`,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_active
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, full_name, email, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const user = users[0];

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun sendiri'
      });
    }

    // Delete user
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    // Log action
    await pool.execute(
      'INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, note) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'delete_user', 'user', id, null]
    );

    res.json({
      success: true,
      message: 'User berhasil dihapus',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Dashboard summary (users, companies, jobs, applications)
 */
const getDashboardStats = async (req, res) => {
  try {
    const [[users]] = await pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'pelamar' THEN 1 ELSE 0 END) as total_pelamar,
        SUM(CASE WHEN role = 'hr' THEN 1 ELSE 0 END) as total_hr,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admin,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_users
      FROM users
    `);

    const [[companies]] = await pool.execute(`
      SELECT COUNT(*) as total_companies,
             SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) as active_companies
      FROM companies
    `);

    const [jobs] = await pool.execute(`
      SELECT verification_status, COUNT(*) as total
      FROM job_posts
      GROUP BY verification_status
    `);

    const [apps] = await pool.execute(`
      SELECT status, COUNT(*) as total
      FROM applications
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        users,
        companies,
        jobs,
        applications: apps
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

/**
 * Get activity logs
 */
const getActivityLogs = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, u.email AS admin_email
      FROM admin_activity_logs a
      JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};



module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getDashboardStats,
  getActivityLogs
};
