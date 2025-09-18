// controllers/adminController.js
const { db } = require('../config/database');

/**
 * Get all users (with pagination, role filter, search)
 */
const getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, role, search, email, format, single } = req.query;

    // Validasi angka
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    const offset = (page - 1) * limit;

    // Build WHERE + params terikat
    let where = 'WHERE 1=1';
    const params = [];
    const countParams = [];

    if (role && ['admin', 'hr', 'pelamar'].includes(role)) {
      where += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }

    if (email) {
      where += ' AND LOWER(email) = LOWER(?)';
      params.push(email);
      countParams.push(email);
    }

    if (search) {
      where += ' AND (full_name LIKE ? OR email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
      countParams.push(s, s);
    }

    // LIMIT/OFFSET disisipkan sebagai angka (bukan placeholder) → aman karena sudah divalidasi
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

    const [usersRows] = await db.query(listSql, params);
    const [countRows] = await db.query(countSql, countParams);
    const total = countRows[0]?.total ?? 0;

    // format single
    if (format === 'single' || single === '1' || limit === 1) {
      if (!usersRows.length) {
        return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      }
      return res.json({ success: true, data: usersRows[0] });
    }

    return res.json({
      success: true,
      data: {
        users: usersRows,
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

    const [rows] = await db.query(
      `SELECT id, full_name, email, role, company_name, company_address, position,
              address, date_of_birth, phone, is_active, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/**
 * Update user status (activate/deactivate)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [rows] = await db.query(
      'SELECT id, full_name, email, role FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    const user = rows[0];

    // Normalisasi boolean
    const activeBool =
      is_active === true ||
      is_active === 1 ||
      is_active === '1' ||
      String(is_active).toLowerCase() === 'true';

    // Cegah menonaktifkan akun sendiri
    if (user.id === req.user.id && !activeBool) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menonaktifkan akun sendiri' });
    }

    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [activeBool ? 1 : 0, id]);

    // log admin (optional, abaikan gagal)
    try {
      await db.query(
        `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, note)
         VALUES (?, ?, 'user', ?, NULL)`,
        [req.user.id, activeBool ? 'activate_user' : 'deactivate_user', id]
      );
    } catch {}

    return res.json({
      success: true,
      message: `User ${activeBool ? 'diaktifkan' : 'dinonaktifkan'} berhasil`,
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_active: activeBool
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      'SELECT id, full_name, email, role FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
    const user = rows[0];

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus akun sendiri' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);

    // log admin (optional)
    try {
      await db.query(
        `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, note)
         VALUES (?, 'delete_user', 'user', ?, NULL)`,
        [req.user.id, id]
      );
    } catch {}

    return res.json({
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
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};


/**
 * Dashboard summary (users, companies, jobs, applications)
 */
const getDashboardStats = async (_req, res) => {
  try {
    const [userAgg] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'pelamar' THEN 1 ELSE 0 END) AS total_pelamar,
        SUM(CASE WHEN role = 'hr' THEN 1 ELSE 0 END)        AS total_hr,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END)     AS total_admin,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)      AS active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END)      AS inactive_users
      FROM users
    `);
    const users = userAgg[0] || {
      total_users: 0,
      total_pelamar: 0,
      total_hr: 0,
      total_admin: 0,
      active_users: 0,
      inactive_users: 0
    };

    const [companyAgg] = await db.query(`
      SELECT
        COUNT(*) AS total_companies,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_companies
      FROM companies
    `);
    const companies = companyAgg[0] || { total_companies: 0, active_companies: 0 };

    const [jobsAgg] = await db.query(`
      SELECT verification_status, COUNT(*) AS total
      FROM job_posts
      GROUP BY verification_status
    `);

    const [appsAgg] = await db.query(`
      SELECT status, COUNT(*) AS total
      FROM applications
      GROUP BY status
    `);

    return res.json({
      success: true,
      data: {
        users,
        companies,
        jobs: jobsAgg,
        applications: appsAgg
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};


/**
 * Get activity logs
 */
const getActivityLogs = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, u.email AS admin_email
      FROM admin_activity_logs a
      JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};



module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getDashboardStats,
  getActivityLogs,
};
