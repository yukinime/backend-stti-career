// controllers/pelamarController.js
const { pool } = require('../config/database');

// helper: ambil id profil pelamar dari user_id
async function getPelamarProfileIdByUser(userId) {
  const [rows] = await pool.execute(
    'SELECT id FROM pelamar_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows.length ? rows[0].id : null;
}


// Get all available job posts
const getJobPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, location } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT jp.*, u.full_name AS hr_name, c.nama_companies AS company_name,
                   COUNT(a.id) as total_applications
            FROM job_posts jp
            JOIN users u ON jp.hr_id = u.id
             LEFT JOIN companies c ON jp.company_id = c.id
            LEFT JOIN applications a ON jp.id = a.job_id
            WHERE jp.is_active = true
        `;
        let params = [];

        // Search by title or company
        if (search) {
            query += ' AND (jp.title LIKE ? OR c.nama_companies LIKE ? OR jp.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Filter by location
        if (location) {
            query += ' AND jp.location LIKE ?';
            params.push(`%${location}%`);
        }

        query += ' GROUP BY jp.id ORDER BY jp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [jobPosts] = await pool.execute(query, params);

        // Count total
         let countQuery = `
            SELECT COUNT(*) as total 
            FROM job_posts jp
            JOIN users u ON jp.hr_id = u.id
            LEFT JOIN companies c ON jp.company_id = c.id
            WHERE jp.is_active = true
            `;
        let countParams = [];

        if (search) {
            countQuery += ' AND (jp.title LIKE ? OR c.nama_companies LIKE ? OR jp.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (location) {
            countQuery += ' AND jp.location LIKE ?';
            countParams.push(`%${location}%`);
        }

        const [totalResult] = await pool.execute(countQuery, countParams);
        const total = totalResult[0].total;

        res.json({
            success: true,
            data: {
                job_posts: jobPosts,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get job posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get job post by ID
const getJobPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [jobPosts] = await pool.execute(
      `SELECT 
         jp.*,
         u.full_name as hr_name,
         c.nama_companies AS company_name,
         hp.company_address,
         EXISTS(
           SELECT 1 
           FROM applications a
           JOIN pelamar_profiles p2 ON p2.id = a.pelamar_id
           WHERE a.job_id = jp.id 
             AND p2.user_id = ?
         ) as has_applied
       FROM job_posts jp 
       JOIN users u ON jp.hr_id = u.id
       LEFT JOIN companies c ON jp.company_id = c.id
       LEFT JOIN hr_profiles hp ON hp.user_id = u.id
       WHERE jp.id = ? AND jp.is_active = true`,
      [userId, id]
    );

    if (jobPosts.length === 0) {
      return res.status(404).json({ success: false, message: 'Lowongan pekerjaan tidak ditemukan' });
    }

    res.json({ success: true, data: jobPosts[0] });
  } catch (error) {
    console.error('Get job post by ID error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Apply for a job
const applyForJob = async (req, res) => {
  try {
    const { job_id, cover_letter } = req.body || {};
    const userId = req.user.id;

    if (!job_id) {
      return res.status(400).json({ success: false, message: 'job_id wajib diisi' });
    }

    // pastikan profil pelamar ada
    const pelamarProfileId = await getPelamarProfileIdByUser(userId);
    if (!pelamarProfileId) {
      return res.status(400).json({
        success: false,
        message: 'Profil pelamar belum ada. Lengkapi profil pelamar dulu.'
      });
    }

    // job harus aktif
    const [jobPosts] = await pool.execute(
      'SELECT id, title, is_active FROM job_posts WHERE id = ?',
      [job_id]
    );
    if (!jobPosts.length) {
      return res.status(404).json({ success: false, message: 'Lowongan pekerjaan tidak ditemukan' });
    }
    if (jobPosts[0].is_active === 0) {
      return res.status(400).json({ success: false, message: 'Job sudah tidak aktif' });
    }

    // cegah double-apply berdasarkan profil pelamar
    const [dup] = await pool.execute(
      'SELECT id FROM applications WHERE job_id = ? AND pelamar_id = ? LIMIT 1',
      [job_id, pelamarProfileId]
    );
    if (dup.length) {
      return res.status(409).json({ success: false, message: 'Anda sudah melamar untuk posisi ini' });
    }

    // insert (pelamar_id = id profil)
    const [ins] = await pool.execute(
      'INSERT INTO applications (job_id, pelamar_id, cover_letter, status, notes) VALUES (?, ?, ?, ?, ?)',
      [job_id, pelamarProfileId, cover_letter || '', 'pending', '']
    );

    res.status(201).json({
      success: true,
      message: 'Lamaran berhasil dikirim',
      data: {
        application_id: ins.insertId,
        job_title: jobPosts[0].title,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Tracking lamaran saya (pelamar) — fix ER_WRONG_ARGUMENTS
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // pagination aman (angka)
    const pageNum  = parseInt(req.query.page, 10);
    const limitNum = parseInt(req.query.limit, 10);

    const page  = Number.isInteger(pageNum)  && pageNum  > 0 ? pageNum  : 1;
    const limit = Number.isInteger(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 10;
    const offset = (page - 1) * limit;

    // filter status (opsional)
    const allowedStatus = new Set(["pending", "accepted", "rejected"]);
    const status = (req.query.status || "").toLowerCase();
    const useStatus = allowedStatus.has(status);

    // WHERE & params
    const whereParts = ["p.user_id = ?"];
    const params = [userId];
    if (useStatus) {
      whereParts.push("a.status = ?");
      params.push(status);
    }
    const whereSql = "WHERE " + whereParts.join(" AND ");

    // ⚠️ Inline LIMIT/OFFSET (angka sudah divalidasi)
    const dataSql = `
      SELECT
        a.id, a.job_id, a.pelamar_id, a.status, a.cover_letter, a.notes, a.applied_at,
        j.title AS job_title, j.location, j.salary_range,
        c.nama_companies AS company_name
      FROM applications a
      JOIN pelamar_profiles p ON p.id = a.pelamar_id
      JOIN job_posts j        ON j.id = a.job_id
      LEFT JOIN companies c   ON c.id = j.company_id
      ${whereSql}
      ORDER BY a.applied_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(dataSql, params);

    // count (tanpa limit/offset)
    const countSql = `
      SELECT COUNT(*) AS total
      FROM applications a
      JOIN pelamar_profiles p ON p.id = a.pelamar_id
      ${whereSql}
    `;
    const [cnt] = await pool.execute(countSql, params);
    const total = cnt[0]?.total || 0;

    return res.json({
      success: true,
      page,
      limit,
      total,
      data: rows
    });
  } catch (err) {
    console.error("getMyApplications error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Cancel application (only if status is pending)
const cancelApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // pastikan lamaran milik user (via profil)
    const [apps] = await pool.execute(
      `SELECT a.id, a.status, jp.title as job_title
       FROM applications a
       JOIN pelamar_profiles p ON p.id = a.pelamar_id
       JOIN job_posts jp       ON a.job_id = jp.id
       WHERE a.id = ? AND p.user_id = ?`,
      [id, userId]
    );
    if (!apps.length) {
      return res.status(404).json({ success: false, message: 'Aplikasi tidak ditemukan' });
    }
    const app = apps[0];
    if (app.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Tidak dapat membatalkan aplikasi yang sudah diproses' });
    }

    await pool.execute('DELETE FROM applications WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Aplikasi berhasil dibatalkan',
      data: { id: parseInt(id,10), job_title: app.job_title }
    });

  } catch (error) {
    console.error('Cancel application error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { full_name, address, date_of_birth, phone } = req.body;
        const pelamar_id = req.user.id;

        // Update profile
        await pool.execute(
            'UPDATE users SET full_name = ?, address = ?, date_of_birth = ?, phone = ? WHERE id = ?',
            [full_name, address, date_of_birth, phone, pelamar_id]
        );

        // Get updated profile
        const [users] = await pool.execute(
            'SELECT id, full_name, email, address, date_of_birth, phone, updated_at FROM users WHERE id = ?',
            [pelamar_id]
        );

        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            data: users[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get pelamar dashboard statistics
const getPelamarDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await pool.execute(
      `SELECT 
         COUNT(*) as total_applications,
         SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) as pending_applications,
         SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_applications,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
       FROM applications a
       JOIN pelamar_profiles p ON p.id = a.pelamar_id
       WHERE p.user_id = ?`, 
      [userId]
    );

    const [jobStats] = await pool.execute(
      'SELECT COUNT(*) as available_jobs FROM job_posts WHERE is_active = true'
    );

    res.json({
      success: true,
      data: {
        ...stats[0],
        available_jobs: jobStats[0].available_jobs
      }
    });

  } catch (error) {
    console.error('Get pelamar dashboard error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = {
    getJobPosts,
    getJobPostById,
    applyForJob,
    getMyApplications,
    cancelApplication,
    updateProfile,
    getPelamarDashboard
};