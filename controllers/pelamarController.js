// controllers/pelamarController.js
const { pool } = require('../config/database');

/* =========================
   LIST JOBS (public/umum, tapi dipanggil via role pelamar)
   ========================= */
const getJobPosts = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 50));
    const offset = (page - 1) * limit;

    const search   = (req.query.search || '').trim();
    const location = (req.query.location || '').trim();

    let sql = `
      SELECT 
        jp.*,
        u.full_name AS hr_name,
        c.nama_companies AS company_name,
        COUNT(a.id) AS total_applications
      FROM job_posts jp
      JOIN users u        ON jp.hr_id = u.id
      LEFT JOIN companies c ON jp.company_id = c.id
      LEFT JOIN applications a ON a.job_id = jp.id
      WHERE jp.is_active = 1
    `;
    const params = [];

    if (search) {
      sql += ` AND (jp.title LIKE ? OR c.nama_companies LIKE ? OR jp.description LIKE ?)`;
      const q = `%${search}%`;
      params.push(q, q, q);
    }
    if (location) {
      sql += ` AND jp.location LIKE ?`;
      params.push(`%${location}%`);
    }

    sql += ` GROUP BY jp.id ORDER BY jp.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);

    // hitung total tanpa LIMIT
    let countSql = `
      SELECT COUNT(*) AS total
      FROM job_posts jp
      LEFT JOIN companies c ON jp.company_id = c.id
      WHERE jp.is_active = 1
    `;
    const countParams = [];
    if (search) {
      countSql += ` AND (jp.title LIKE ? OR c.nama_companies LIKE ? OR jp.description LIKE ?)`;
      const q = `%${search}%`;
      countParams.push(q, q, q);
    }
    if (location) {
      countSql += ` AND jp.location LIKE ?`;
      countParams.push(`%${location}%`);
    }
    const [totalRes] = await pool.execute(countSql, countParams);
    const total = totalRes[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        job_posts: rows,
        pagination: {
          current_page: page,
          items_per_page: limit,
          total_items: total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get job posts error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/* =========================
   DETAIL JOB (login pelamar) + has_applied
   ========================= */
const getJobPostById = async (req, res) => {
  try {
    const jobId  = Number(req.params.id);
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT 
         jp.*,
         u.full_name AS hr_name,
         c.nama_companies AS company_name,
         hp.company_address,
         EXISTS(
           SELECT 1
           FROM applications a
           JOIN pelamar_profiles p2 ON p2.id = a.pelamar_id
           WHERE a.job_id = jp.id AND p2.user_id = ?
         ) AS has_applied
       FROM job_posts jp
       JOIN users u ON u.id = jp.hr_id
       LEFT JOIN companies c ON c.id = jp.company_id
       LEFT JOIN hr_profiles hp ON hp.user_id = u.id
       WHERE jp.id = ? AND jp.is_active = 1
       LIMIT 1`,
      [userId, jobId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Lowongan pekerjaan tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get job post by ID error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/* =========================
   APPLY JOB (upload file optional + fallback profil)
   ========================= */
const applyForJob = async (req, res) => {
console.log('DEBUG apply files:', Object.keys(req.files || {}), {
  resume: req.files?.resume_file?.[0]?.filename,
  cover:  req.files?.cover_letter_file?.[0]?.filename,
  port:   req.files?.portfolio_file?.[0]?.filename,
});
  try {
    const { job_id, cover_letter } = req.body || {};
    const userId = req.user.id;

    if (!job_id) {
      return res.status(400).json({ success: false, message: 'job_id wajib diisi' });
    }

    // profil pelamar (id + default files)
    const [prof] = await pool.execute(
      `SELECT id, cv_file, cover_letter_file, portfolio_file
       FROM pelamar_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );
    if (!prof.length) {
      return res.status(400).json({ success: false, message: 'Profil pelamar belum ada. Lengkapi profil pelamar dulu.' });
    }
    const pelamarProfileId = prof[0].id;

    // job aktif
    const [jobs] = await pool.execute(
      `SELECT id, title, is_active FROM job_posts WHERE id = ?`,
      [job_id]
    );
    if (!jobs.length) {
      return res.status(404).json({ success: false, message: 'Lowongan pekerjaan tidak ditemukan' });
    }
    if (jobs[0].is_active === 0) {
      return res.status(400).json({ success: false, message: 'Job sudah tidak aktif' });
    }

    // cegah double apply
    const [dup] = await pool.execute(
      `SELECT id FROM applications WHERE job_id = ? AND pelamar_id = ? LIMIT 1`,
      [job_id, pelamarProfileId]
    );
    if (dup.length) {
      return res.status(409).json({ success: false, message: 'Anda sudah melamar untuk posisi ini' });
    }

    // file upload (opsional)
    const host  = req.get('host');
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';

    const uploadedResumeUrl = req.files?.resume_file?.[0]
      ? `${proto}://${host}/uploads/files/${req.files.resume_file[0].filename}`
      : '';

    const uploadedCLUrl = req.files?.cover_letter_file?.[0]
      ? `${proto}://${host}/uploads/files/${req.files.cover_letter_file[0].filename}`
      : '';

    const uploadedPortfolioUrl = req.files?.portfolio_file?.[0]
      ? `${proto}://${host}/uploads/files/${req.files.portfolio_file[0].filename}`
      : '';

    // final: upload > profil > ""
    const finalResume    = uploadedResumeUrl    || prof[0].cv_file           || null;
    const finalCLFile    = uploadedCLUrl        || prof[0].cover_letter_file || null;
    const finalPortfolio = uploadedPortfolioUrl || prof[0].portfolio_file    || null;

    // insert application
    const [ins] = await pool.execute(
      `INSERT INTO applications
         (job_id, pelamar_id, cover_letter, resume_file, cover_letter_file, portfolio_file, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [job_id, pelamarProfileId, cover_letter || '', finalResume, finalCLFile, finalPortfolio, 'pending', '']
    );

    return res.status(201).json({
      success: true,
      message: 'Lamaran berhasil dikirim',
      data: {
        application_id: ins.insertId,
        job_title: jobs[0].title,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/* =========================
   TRACKING "LAMARAN SAYA"
   ========================= */
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 50));
    const offset = (page - 1) * limit;

    const allowed = new Set(['pending', 'accepted', 'rejected']);
    const status = (req.query.status || '').toLowerCase();
    const useStatus = allowed.has(status);

    const whereParts = ['p.user_id = ?'];
    const params = [userId];
    if (useStatus) {
      whereParts.push('a.status = ?');
      params.push(status);
    }
    const whereSql = 'WHERE ' + whereParts.join(' AND ');

    const dataSql = `
      SELECT
        a.id, a.job_id, a.pelamar_id, a.status, a.cover_letter, a.notes, a.applied_at,
        COALESCE(NULLIF(a.resume_file, ''),       p.cv_file)           AS resume_file,
        COALESCE(NULLIF(a.cover_letter_file, ''), p.cover_letter_file) AS cover_letter_file,
        COALESCE(NULLIF(a.portfolio_file, ''),    p.portfolio_file)    AS portfolio_file,
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

    const countSql = `
      SELECT COUNT(*) AS total
      FROM applications a
      JOIN pelamar_profiles p ON p.id = a.pelamar_id
      ${whereSql}
    `;
    const [cnt] = await pool.execute(countSql, params);

    return res.json({
      success: true,
      page, limit,
      total: cnt[0]?.total || 0,
      data: rows
    });
  } catch (err) {
    console.error('getMyApplications error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/* =========================
   BATALKAN LAMARAN (kalau status masih pending)
   ========================= */
const cancelApplication = async (req, res) => {
  try {
    const appId  = Number(req.params.id);
    const userId = req.user.id;

    const [apps] = await pool.execute(
      `SELECT a.id, a.status, jp.title AS job_title
       FROM applications a
       JOIN pelamar_profiles p ON p.id = a.pelamar_id
       JOIN job_posts jp       ON jp.id = a.job_id
       WHERE a.id = ? AND p.user_id = ?`,
      [appId, userId]
    );
    if (!apps.length) {
      return res.status(404).json({ success: false, message: 'Aplikasi tidak ditemukan' });
    }
    if (apps[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Tidak dapat membatalkan aplikasi yang sudah diproses' });
    }

    await pool.execute(`DELETE FROM applications WHERE id = ?`, [appId]);

    return res.json({
      success: true,
      message: 'Aplikasi berhasil dibatalkan',
      data: { id: appId, job_title: apps[0].job_title }
    });
  } catch (error) {
    console.error('Cancel application error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/* =========================
   UPDATE PROFIL USER (basic)
   ========================= */
const updateProfile = async (req, res) => {
  try {
    const { full_name, address, date_of_birth, phone } = req.body || {};
    const userId = req.user.id;

    await pool.execute(
      `UPDATE users SET full_name = ?, address = ?, date_of_birth = ?, phone = ? WHERE id = ?`,
      [full_name || null, address || null, date_of_birth || null, phone || null, userId]
    );

    const [u] = await pool.execute(
      `SELECT id, full_name, email, address, date_of_birth, phone, updated_at FROM users WHERE id = ?`,
      [userId]
    );

    return res.json({ success: true, message: 'Profil berhasil diperbarui', data: u[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

/* =========================
   DASHBOARD PELAMAR
   ========================= */
const getPelamarDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await pool.execute(
      `SELECT 
         COUNT(*) AS total_applications,
         SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_applications,
         SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_applications,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_applications
       FROM applications a
       JOIN pelamar_profiles p ON p.id = a.pelamar_id
       WHERE p.user_id = ?`,
      [userId]
    );

    const [jobStats] = await pool.execute(
      `SELECT COUNT(*) AS available_jobs FROM job_posts WHERE is_active = 1`
    );

    return res.json({
      success: true,
      data: {
        ...stats[0],
        available_jobs: jobStats[0]?.available_jobs || 0
      }
    });
  } catch (error) {
    console.error('Get pelamar dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
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
