// controllers/companyController.js
const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const { COMPANY_LOGOS_DIR } = require('../config/paths');

/* ===========================
   Company CRUD (existing)
=========================== */
exports.getAllCompanies = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM companies');
    res.json(rows);
  } catch (err) {
    console.error('[getAllCompanies]', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.getCompanyById = async (req, res) => {
  const companyId = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[getCompanyById]', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.createCompany = async (req, res) => {
  const { nama_companies, email_companies, nomor_telepon, website, alamat, logo } = req.body;
  if (!nama_companies || !email_companies) {
    return res.status(400).json({
      success: false,
      message: 'Nama perusahaan dan email perusahaan wajib diisi',
      missing: { nama_companies: !nama_companies, email_companies: !email_companies }
    });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO companies (nama_companies, email_companies, nomor_telepon, website, alamat, logo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama_companies, email_companies, nomor_telepon, website, alamat, logo]
    );
    return res.status(201).json({
      success: true,
      message: 'Perusahaan berhasil dibuat',
      data: {
        id_companies: result.insertId,
        nama_companies, email_companies, nomor_telepon, website, alamat, logo
      }
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email perusahaan sudah terdaftar', field: 'email_companies' });
    }
    console.error('[createCompany] DB Error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
};

exports.updateCompany = async (req, res) => {
  const companyId = req.params.id;
  const { nama_companies, email_companies, nomor_telepon, website, alamat, logo } = req.body;
  if (!nama_companies || !email_companies) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const [result] = await db.query(
      `UPDATE companies
       SET nama_companies=?, email_companies=?, nomor_telepon=?, website=?, alamat=?, logo=?
       WHERE id=?`,
      [nama_companies, email_companies, nomor_telepon, website, alamat, logo, companyId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    console.error('[updateCompany]', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteCompany = async (req, res) => {
  const companyId = req.params.id;
  try {
    const [result] = await db.query('DELETE FROM companies WHERE id = ?', [companyId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('[deleteCompany]', err);
    res.status(500).json({ error: 'Database error' });
  }
};

/* ===========================
   Upload Logo by :id (admin/hr)
   -> Multer dijalankan di routes, controller pakai req.file
=========================== */
exports.uploadLogo = async (req, res) => {
  try {
    const companyId = req.params.id;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'File logo wajib diupload' });
    }

    // cek perusahaan
    const [rows] = await db.query('SELECT logo FROM companies WHERE id = ?', [companyId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Company not found' });

    // hapus logo lama
    const oldLogo = rows[0].logo;
    if (oldLogo) {
      const oldPath = path.join(COMPANY_LOGOS_DIR, oldLogo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // update DB
    await db.query('UPDATE companies SET logo=? WHERE id=?', [file.filename, companyId]);

    res.json({
      success: true,
      message: 'Logo perusahaan berhasil diupload',
      filename: file.filename,
      url: `${req.protocol}://${req.get('host')}/uploads/company_logos/${file.filename}`
    });
  } catch (err) {
    console.error('[uploadLogo]', err);
    res.status(500).json({ success: false, message: 'Gagal mengupload logo perusahaan' });
  }
};

/* ===========================
   HR-scoped helpers & handlers
=========================== */
// ambil company_id milik HR yang login
async function resolveHrCompanyId(userId) {
  const [rows] = await db.query(
    `
    SELECT COALESCE(u.company_id, hp.company_id) AS company_id
    FROM users u
    LEFT JOIN hr_profiles hp ON hp.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
    `,
    [userId]
  );
  return rows?.[0]?.company_id || null;
}

// GET /api/company/me
exports.getMyCompany = async (req, res) => {
  try {
    const userId = req.user?.id;
    const companyId = await resolveHrCompanyId(userId);
    if (!companyId) return res.status(404).json({ message: 'Perusahaan tidak ditemukan untuk akun ini' });

    const [rows] = await db.query(
      'SELECT id, nama_companies, email_companies, nomor_telepon, website, alamat, logo FROM companies WHERE id = ?',
      [companyId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Company not found' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = rows[0].logo ? `${baseUrl}/uploads/company_logos/${rows[0].logo}` : null;

    return res.json({ ...rows[0], logo_url: logoUrl });
  } catch (err) {
    console.error('[getMyCompany]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/company/me/logo
exports.uploadMyCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File logo wajib diupload (field: "logo")' });
    }

    const userId = req.user?.id;
    const companyId = await resolveHrCompanyId(userId);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Akun HR belum terhubung ke perusahaan' });
    }

    const [rows] = await db.query('SELECT logo FROM companies WHERE id = ?', [companyId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Company not found' });

    const oldLogo = rows[0].logo;
    if (oldLogo) {
      const oldPath = path.join(COMPANY_LOGOS_DIR, oldLogo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db.query('UPDATE companies SET logo=? WHERE id=?', [req.file.filename, companyId]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.json({
      success: true,
      message: 'Logo perusahaan berhasil diupload',
      company_id: companyId,
      filename: req.file.filename,
      url: `${baseUrl}/uploads/company_logos/${req.file.filename}`
    });
  } catch (err) {
    console.error('[uploadMyCompanyLogo]', err);
    return res.status(500).json({ success: false, message: 'Gagal mengupload logo perusahaan' });
  }
};
