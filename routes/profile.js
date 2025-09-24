// routes/profile.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { pool } = require('../config/database');
const { buildUploadUrl } = require('../utils/url');

/* ===========================
   Util: Direktori & URL Publik
   =========================== */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
};

// pastikan folder upload ada
ensureDirectoryExists(path.join(process.cwd(), 'uploads', 'files'));
ensureDirectoryExists(path.join(process.cwd(), 'uploads', 'images'));

const getBaseUrl = (req) => {
  const fromEnv = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
};

const filePublicUrl = (req, type /* 'images' | 'files' */, filename) => {
  if (!filename) return null;
  return `${getBaseUrl(req)}/uploads/${type}/${filename}`;
};

/* ===========================
   Multer: konfigurasi upload
   =========================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const uploadPath = path.join(process.cwd(), 'uploads', isImage ? 'images' : 'files');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(safeName)}`);
  }
});

const allowedMimeTypes = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
  return cb(new Error('File type not allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

/* ===========================
   Helper: pastikan profil pelamar
   =========================== */
const ensurePelamarProfileExists = async (userId) => {
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM pelamar_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      const [user] = await pool.execute(
        'SELECT full_name, email, phone, address, date_of_birth FROM users WHERE id = ?',
        [userId]
      );
      if (user.length) {
        const u = user[0];
        await pool.execute(
          `INSERT INTO pelamar_profiles 
           (user_id, full_name, email, phone, address, date_of_birth) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, u.full_name, u.email, u.phone, u.address, u.date_of_birth]
        );
        console.log(`✅ Created pelamar profile for user ID: ${userId}`);
      }
    }
    return true;
  } catch (e) {
    console.error('Error ensuring pelamar profile exists:', e);
    return false;
  }
};

/* ===========================
   GET /api/profile
   =========================== */
router.get('/', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    await ensurePelamarProfileExists(userId);

    const [profileRows] = await pool.execute(
      `SELECT pp.*, u.created_at as user_created_at 
       FROM pelamar_profiles pp 
       LEFT JOIN users u ON pp.user_id = u.id 
       WHERE pp.user_id = ?`,
      [userId]
    );

    if (!profileRows.length) {
      return res.status(404).json({ success: false, message: 'Profil pelamar tidak ditemukan' });
    }

    const profile = profileRows[0];

    // lampirkan URL absolut untuk file-file di profil
    const profile_photo_url = profile.profile_photo
    ? buildUploadUrl(req, 'images', profile.profile_photo)
    : null;
    const cv_file_url = profile.cv_file ? filePublicUrl(req, 'files', profile.cv_file) : null;
    const cover_letter_file_url = profile.cover_letter_file
      ? filePublicUrl(req, 'files', profile.cover_letter_file)
      : null;
    const portfolio_file_url = profile.portfolio_file
      ? filePublicUrl(req, 'files', profile.portfolio_file)
      : null;

    const [workExp] = await pool.execute(
      'SELECT * FROM work_experiences WHERE user_id = ? ORDER BY start_date DESC',
      [userId]
    );
    const [certificates] = await pool.execute(
      'SELECT id,certificate_name,issuer,issue_date,expiry_date,certificate_file,created_at,updated_at FROM certificates WHERE user_id = ? ORDER BY issue_date DESC',
      [userId]
    );
    // tambahkan url file sertifikat
    const certsWithUrl = certificates.map(c => ({
      ...c,
      certificate_file_url: c.certificate_file ? filePublicUrl(req, 'files', c.certificate_file) : null
    }));

    const [skills] = await pool.execute(
      'SELECT * FROM skills WHERE user_id = ? ORDER BY skill_name ASC',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Data profil berhasil diambil',
      data: {
        ...profile,
        profile_photo_url,
        cv_file_url,
        cover_letter_file_url,
        portfolio_file_url,
        work_experiences: workExp,
        certificates: certsWithUrl,
        skills
      }
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data profil' });
  }
});

/* ===========================
   PUT /api/profile/biodata
   =========================== */
router.put('/biodata', authenticateToken, requireRole('pelamar'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const userId = req.user.id;
    const { full_name, email, phone, address, city, country } = req.body;

    await ensurePelamarProfileExists(userId);

    await conn.execute(
      `UPDATE pelamar_profiles 
       SET full_name=?, email=?, phone=?, address=?, city=?, country=?, updated_at=NOW()
       WHERE user_id=?`,
      [full_name, email, phone, address, city, country, userId]
    );

    await conn.execute(
      'UPDATE users SET full_name=?, email=?, phone=?, address=?, updated_at=NOW() WHERE id=?',
      [full_name, email, phone, address, userId]
    );

    await conn.commit();
    return res.json({ success: true, message: 'Data biodata berhasil diperbarui' });
  } catch (error) {
    await conn.rollback();
    console.error('❌ Error updating biodata:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data biodata' });
  } finally {
    conn.release();
  }
});

/* ===========================
   PUT /api/profile/education
   =========================== */
router.put('/education', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { education_level, major, institution_name, gpa, entry_year, graduation_year } = req.body;

    await ensurePelamarProfileExists(userId);

    await pool.execute(
      `UPDATE pelamar_profiles 
       SET education_level=?, major=?, institution_name=?, gpa=?, 
           entry_year=?, graduation_year=?, updated_at=NOW()
       WHERE user_id=?`,
      [education_level, major, institution_name, gpa, entry_year, graduation_year, userId]
    );

    return res.json({ success: true, message: 'Data pendidikan berhasil diperbarui' });
  } catch (error) {
    console.error('❌ Error updating education:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui data pendidikan' });
  }
});

/* ===========================
   POST /api/profile/work-experience
   =========================== */
router.post('/work-experience', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { company_name, position, start_date, end_date, is_current, job_description } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO work_experiences 
       (user_id, company_name, position, start_date, end_date, is_current, job_description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, company_name, position, start_date, end_date || null, is_current, job_description]
    );

    return res.json({
      success: true,
      message: 'Pengalaman kerja berhasil ditambahkan',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ Error adding work experience:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan pengalaman kerja' });
  }
});

/* ===========================
   PUT /api/profile/work-experience/:id
   =========================== */
router.put('/work-experience/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const experienceId = req.params.id;
    const { company_name, position, start_date, end_date, is_current, job_description } = req.body;

    const [result] = await pool.execute(
      `UPDATE work_experiences 
       SET company_name=?, position=?, start_date=?, end_date=?, 
           is_current=?, job_description=?, updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [company_name, position, start_date, end_date || null, is_current, job_description, experienceId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pengalaman kerja tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Pengalaman kerja berhasil diperbarui' });
  } catch (error) {
    console.error('❌ Error updating work experience:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengalaman kerja' });
  }
});

/* ===========================
   DELETE /api/profile/work-experience/:id
   =========================== */
router.delete('/work-experience/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const experienceId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM work_experiences WHERE id=? AND user_id=?',
      [experienceId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pengalaman kerja tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Pengalaman kerja berhasil dihapus' });
  } catch (error) {
    console.error('❌ Error deleting work experience:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pengalaman kerja' });
  }
});

/* ===========================
   POST /api/profile/certificate
   =========================== */
router.post(
  '/certificate',
  authenticateToken,
  requireRole('pelamar'),
  upload.single('certificate_file'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { certificate_name, issuer, issue_date, expiry_date } = req.body;
      const certFile = req.file ? req.file.filename : null;

      const [result] = await pool.execute(
        `INSERT INTO certificates 
         (user_id, certificate_name, issuer, issue_date, expiry_date, certificate_file)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, certificate_name, issuer, issue_date, expiry_date || null, certFile]
      );

      return res.json({
        success: true,
        message: 'Sertifikat berhasil ditambahkan',
        data: {
          id: result.insertId,
          certificate_file: certFile,
          certificate_file_url: certFile ? filePublicUrl(req, 'files', certFile) : null
        }
      });
    } catch (error) {
      console.error('❌ Error adding certificate:', error);
      return res.status(500).json({ success: false, message: 'Gagal menambahkan sertifikat' });
    }
  }
);

/* ===========================
   PUT /api/profile/certificate/:id
   =========================== */
router.put(
  '/certificate/:id',
  authenticateToken,
  requireRole('pelamar'),
  upload.single('certificate_file'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const certificateId = req.params.id;
      const { certificate_name, issuer, issue_date, expiry_date } = req.body;

      let updateSql = `UPDATE certificates 
                       SET certificate_name=?, issuer=?, issue_date=?, expiry_date=?, updated_at=NOW()`;
      const params = [certificate_name, issuer, issue_date, expiry_date || null];

      // ganti file lama bila ada file baru
      if (req.file) {
        const [old] = await pool.execute(
          'SELECT certificate_file FROM certificates WHERE id=? AND user_id=?',
          [certificateId, userId]
        );
        const oldName = old[0]?.certificate_file;
        if (oldName) {
          const oldPath = path.join(process.cwd(), 'uploads', 'files', oldName);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updateSql += `, certificate_file=?`;
        params.push(req.file.filename);
      }

      updateSql += ` WHERE id=? AND user_id=?`;
      params.push(certificateId, userId);

      const [result] = await pool.execute(updateSql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Sertifikat tidak ditemukan' });
      }

      return res.json({
        success: true,
        message: 'Sertifikat berhasil diperbarui',
        certificate_file_url: req.file ? filePublicUrl(req, 'files', req.file.filename) : undefined
      });
    } catch (error) {
      console.error('❌ Error updating certificate:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui sertifikat' });
    }
  }
);

/* ===========================
   DELETE /api/profile/certificate/:id
   =========================== */
router.delete('/certificate/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const certificateId = req.params.id;

    const [cert] = await pool.execute(
      'SELECT certificate_file FROM certificates WHERE id=? AND user_id=?',
      [certificateId, userId]
    );
    if (!cert.length) {
      return res.status(404).json({ success: false, message: 'Sertifikat tidak ditemukan' });
    }

    // hapus file fisik
    if (cert[0].certificate_file) {
      const f = path.join(process.cwd(), 'uploads', 'files', cert[0].certificate_file);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    await pool.execute('DELETE FROM certificates WHERE id=? AND user_id=?', [certificateId, userId]);

    return res.json({ success: true, message: 'Sertifikat berhasil dihapus' });
  } catch (error) {
    console.error('❌ Error deleting certificate:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus sertifikat' });
  }
});

/* ===========================
   POST /api/profile/upload-files
   =========================== */
router.post(
  '/upload-files',
  authenticateToken,
  requireRole('pelamar'),
  upload.fields([
    { name: 'cv_file', maxCount: 1 },
    { name: 'cover_letter_file', maxCount: 1 },
    { name: 'portfolio_file', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const files = req.files || {};

      await ensurePelamarProfileExists(userId);

      const sets = [];
      const vals = [];

      if (files.cv_file?.[0]) {
        sets.push('cv_file=?');
        vals.push(files.cv_file[0].filename);
      }
      if (files.cover_letter_file?.[0]) {
        sets.push('cover_letter_file=?');
        vals.push(files.cover_letter_file[0].filename);
      }
      if (files.portfolio_file?.[0]) {
        sets.push('portfolio_file=?');
        vals.push(files.portfolio_file[0].filename);
      }

      if (sets.length) {
        vals.push(userId);
        await pool.execute(
          `UPDATE pelamar_profiles SET ${sets.join(', ')}, updated_at=NOW() WHERE user_id=?`,
          vals
        );
      }

      return res.json({
        success: true,
        message: 'File berhasil diupload',
        files: {
          cv_file: files.cv_file?.[0]?.filename || null,
          cover_letter_file: files.cover_letter_file?.[0]?.filename || null,
          portfolio_file: files.portfolio_file?.[0]?.filename || null
        },
        urls: {
          cv_file_url: files.cv_file?.[0] ? filePublicUrl(req, 'files', files.cv_file[0].filename) : null,
          cover_letter_file_url: files.cover_letter_file?.[0]
            ? filePublicUrl(req, 'files', files.cover_letter_file[0].filename)
            : null,
          portfolio_file_url: files.portfolio_file?.[0]
            ? filePublicUrl(req, 'files', files.portfolio_file[0].filename)
            : null
        }
      });
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengupload file' });
    }
  }
);

/* ===========================
   POST /api/profile/upload-photo
   =========================== */
router.post(
  '/upload-photo',
  authenticateToken,
  requireRole('pelamar'),
  upload.single('profile_photo'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
      }

      await ensurePelamarProfileExists(userId);

      // hapus foto lama
      const [old] = await pool.execute(
        'SELECT profile_photo FROM pelamar_profiles WHERE user_id=?',
        [userId]
      );
      const oldName = old[0]?.profile_photo;
      if (oldName) {
        const oldPath = path.join(process.cwd(), 'uploads', 'images', oldName);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      await pool.execute(
        'UPDATE pelamar_profiles SET profile_photo=?, updated_at=NOW() WHERE user_id=?',
        [req.file.filename, userId]
      );

      return res.json({
        success: true,
        message: 'Foto profil berhasil diupload',
        filename: req.file.filename,
        url: filePublicUrl(req, 'images', req.file.filename)
      });
    } catch (error) {
      console.error('❌ Error uploading profile photo:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengupload foto profil' });
    }
  }
);

/* ===========================
   SKILL CRUD
   =========================== */
router.post('/skill', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { skill_name, skill_level } = req.body;
    if (!skill_name || !skill_level) {
      return res.status(400).json({ success: false, message: 'Nama skill dan level wajib diisi' });
    }

    const [result] = await pool.execute(
      'INSERT INTO skills (user_id, skill_name, skill_level) VALUES (?, ?, ?)',
      [userId, skill_name, skill_level]
    );
    return res.json({
      success: true,
      message: 'Skill berhasil ditambahkan',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ Error adding skill:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan skill' });
  }
});

router.put('/skill/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const skillId = req.params.id;
    const { skill_name, skill_level } = req.body;
    if (!skill_name || !skill_level) {
      return res.status(400).json({ success: false, message: 'Nama skill dan level wajib diisi' });
    }

    const [result] = await pool.execute(
      'UPDATE skills SET skill_name=?, skill_level=?, updated_at=NOW() WHERE id=? AND user_id=?',
      [skill_name, skill_level, skillId, userId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Skill tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Skill berhasil diperbarui' });
  } catch (error) {
    console.error('❌ Error updating skill:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui skill' });
  }
});

router.delete('/skill/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const skillId = req.params.id;
    const [result] = await pool.execute('DELETE FROM skills WHERE id=? AND user_id=?', [skillId, userId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Skill tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Skill berhasil dihapus' });
  } catch (error) {
    console.error('❌ Error deleting skill:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus skill' });
  }
});

module.exports = router;
