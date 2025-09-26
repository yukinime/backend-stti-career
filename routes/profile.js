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

// terima beberapa nama field untuk foto (biar FE bebas pakai)
const acceptPhotoFields = upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'photo',         maxCount: 1 },
  { name: 'image',         maxCount: 1 },
  { name: 'avatar',        maxCount: 1 },
]);
// izinkan multiple role
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`
    });
  }
  next();
};

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
// Helper: pastikan profil HR ada
const ensureHrProfileExists = async (userId) => {
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM hr_profiles WHERE user_id = ?',
      [userId]
    );
    if (existing.length === 0) {
      const [[u]] = await pool.execute(
        'SELECT company_name, company_address, position FROM users WHERE id = ?',
        [userId]
      );
      await pool.execute(
        `INSERT INTO hr_profiles (user_id, company_name, company_address, position)
         VALUES (?, ?, ?, ?)`,
        [userId, u?.company_name || null, u?.company_address || null, u?.position || null]
      );
      console.log(`✅ Created HR profile for user ID: ${userId}`);
    }
    return true;
  } catch (e) {
    console.error('Error ensuring HR profile exists:', e);
    return false;
  }
};


/* ------------------------------------------------------------------
   💡 Tambahan helper: columnExists + getter/setter foto per role
------------------------------------------------------------------- */

// Cek apakah sebuah kolom ada (dinamis, aman untuk DB yang belum punya kolom foto di hr/users)
async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ? 
       AND COLUMN_NAME = ? 
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

// Ambil nama file foto lama berdasarkan role (prioritas: tabel role masing-masing)
async function getCurrentPhoto(userId, role) {
  try {
    if (role === 'pelamar') {
      const [r] = await pool.execute('SELECT profile_photo FROM pelamar_profiles WHERE user_id=?', [userId]);
      return r[0]?.profile_photo || null;
    }
    if (role === 'hr') {
      if (await columnExists('hr_profiles', 'profile_photo')) {
        const [r] = await pool.execute('SELECT profile_photo FROM hr_profiles WHERE user_id=?', [userId]);
        return r[0]?.profile_photo || null;
      }
      if (await columnExists('users', 'profile_photo')) {
        const [r] = await pool.execute('SELECT profile_photo FROM users WHERE id=?', [userId]);
        return r[0]?.profile_photo || null;
      }
      return null;
    }
    // admin
    if (await columnExists('users', 'profile_photo')) {
      const [r] = await pool.execute('SELECT profile_photo FROM users WHERE id=?', [userId]);
      return r[0]?.profile_photo || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Simpan nama file foto ke tabel sesuai role jika kolomnya tersedia
async function setPhoto(userId, role, filenameOrNull) {
  if (role === 'pelamar') {
    await ensurePelamarProfileExists(userId);
    await pool.execute(
      'UPDATE pelamar_profiles SET profile_photo=?, updated_at=NOW() WHERE user_id=?',
      [filenameOrNull, userId]
    );
    return true;
  }
  if (role === 'hr') {
    if (await columnExists('hr_profiles', 'profile_photo')) {
      await pool.execute(
        'UPDATE hr_profiles SET profile_photo=?, updated_at=NOW() WHERE user_id=?',
        [filenameOrNull, userId]
      );
      return true;
    }
    if (await columnExists('users', 'profile_photo')) {
      await pool.execute(
        'UPDATE users SET profile_photo=?, updated_at=NOW() WHERE id=?',
        [filenameOrNull, userId]
      );
      return true;
    }
    return false;
  }
  // admin
  if (await columnExists('users', 'profile_photo')) {
    await pool.execute(
      'UPDATE users SET profile_photo=?, updated_at=NOW() WHERE id=?',
      [filenameOrNull, userId]
    );
    return true;
  }
  return false;
}

function getPickedPhoto(req) {
  return (req.files?.profile_photo?.[0]) ||
         (req.files?.photo?.[0]) ||
         (req.files?.image?.[0]) ||
         (req.files?.avatar?.[0]) || null;
}

function removeLocalFileIfExists(relativeDir, filename) {
  if (!filename) return;
  const full = path.join(process.cwd(), 'uploads', relativeDir, filename);
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

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

    // URL file publik
    const profile_photo_url = profile.profile_photo
      ? buildUploadUrl(req, 'images', profile.profile_photo)
      : null;
    const cv_file_url = profile.cv_file
      ? buildUploadUrl(req, 'files', profile.cv_file)
      : null;
    const cover_letter_file_url = profile.cover_letter_file
      ? buildUploadUrl(req, 'files', profile.cover_letter_file)
      : null;
    const portfolio_file_url = profile.portfolio_file
      ? buildUploadUrl(req, 'files', profile.portfolio_file)
      : null;

    const [workExp] = await pool.execute(
      'SELECT * FROM work_experiences WHERE user_id = ? ORDER BY start_date DESC',
      [userId]
    );
    const [certificates] = await pool.execute(
      'SELECT id,certificate_name,issuer,issue_date,expiry_date,certificate_file,created_at,updated_at FROM certificates WHERE user_id = ? ORDER BY issue_date DESC',
      [userId]
    );
    const certsWithUrl = certificates.map(c => ({
      ...c,
      certificate_file_url: c.certificate_file ? buildUploadUrl(req, 'files', c.certificate_file) : null
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
          certificate_file_url: certFile ? buildUploadUrl(req, 'files', certFile) : null
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
        certificate_file_url: req.file ? buildUploadUrl(req, 'files', req.file.filename) : undefined
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
   (PELAMAR)
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
          cv_file_url: files.cv_file?.[0] ? buildUploadUrl(req, 'files', files.cv_file[0].filename) : null,
          cover_letter_file_url: files.cover_letter_file?.[0]
            ? buildUploadUrl(req, 'files', files.cover_letter_file[0].filename)
            : null,
          portfolio_file_url: files.portfolio_file?.[0]
            ? buildUploadUrl(req, 'files', files.portfolio_file[0].filename)
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
   (pelamar, hr, admin)
   =========================== */
router.post(
  '/upload-photo',
  authenticateToken,
  allowRoles('pelamar', 'hr', 'admin'),
  acceptPhotoFields, // menerima: profile_photo | photo | image | avatar
  async (req, res) => {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      const f =
        (req.files?.profile_photo?.[0]) ||
        (req.files?.photo?.[0]) ||
        (req.files?.image?.[0]) ||
        (req.files?.avatar?.[0]);

      if (!f) {
        return res.status(400).json({
          success: false,
          message: 'Field file tidak dikenali (pakai: profile_photo / photo / image / avatar)'
        });
      }

      // Tentukan tabel & kolom target berdasarkan role
      let selectSql = '';
      let updateSql = '';
      let ensureFn = async () => true; // default no-op

      if (role === 'pelamar') {
        await ensurePelamarProfileExists(userId);
        selectSql = 'SELECT profile_photo FROM pelamar_profiles WHERE user_id=?';
        updateSql = 'UPDATE pelamar_profiles SET profile_photo=?, updated_at=NOW() WHERE user_id=?';
      } else if (role === 'hr') {
        await ensureHrProfileExists(userId);
        selectSql = 'SELECT profile_photo FROM hr_profiles WHERE user_id=?';
        updateSql = 'UPDATE hr_profiles SET profile_photo=?, updated_at=NOW() WHERE user_id=?';
      } else {
        // admin (atau role lain) → simpan di kolom users.profile_photo
        selectSql = 'SELECT profile_photo FROM users WHERE id=?';
        updateSql = 'UPDATE users SET profile_photo=?, updated_at=NOW() WHERE id=?';
      }

      // Hapus foto lama (jika ada)
      const [oldRows] = await pool.execute(selectSql, [userId]);
      const oldName =
        oldRows?.[0]?.profile_photo &&
        String(oldRows[0].profile_photo).trim().length > 0
          ? oldRows[0].profile_photo
          : null;

      if (oldName) {
        const oldPath = path.join(process.cwd(), 'uploads', 'images', oldName);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_) { /* ignore */ }
        }
      }

      // Simpan nama file baru
      await pool.execute(updateSql, [f.filename, userId]);

      return res.json({
        success: true,
        message: 'Foto profil berhasil diupload',
        filename: f.filename,
        url: buildUploadUrl(req, 'images', f.filename),
        role
      });
    } catch (error) {
      console.error('❌ Error uploading profile photo:', error);
      return res.status(500).json({ success: false, message: 'Gagal mengupload foto profil' });
    }
  }
);

/* ============================================================
   ✅ Tambahan sesuai permintaan:
   PELAMAR: PUT + DELETE foto
   ============================================================ */
router.put(
  '/upload-photo',
  authenticateToken,
  requireRole('pelamar'),
  acceptPhotoFields,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const f = getPickedPhoto(req);
      if (!f) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
      }

      // hapus foto lama user ini saja
      const old = await getCurrentPhoto(userId, 'pelamar');
      removeLocalFileIfExists('images', old);

      await pool.execute(
        'UPDATE pelamar_profiles SET profile_photo=?, updated_at=NOW() WHERE user_id=?',
        [f.filename, userId]
      );

      return res.json({
        success: true,
        message: 'Foto profil berhasil diperbarui',
        filename: f.filename,
        url: buildUploadUrl(req, 'images', f.filename)
      });
    } catch (error) {
      console.error('❌ PUT /upload-photo error:', error);
      return res.status(500).json({ success: false, message: 'Gagal memperbarui foto profil' });
    }
  }
);

router.delete('/photo', authenticateToken, requireRole('pelamar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const old = await getCurrentPhoto(userId, 'pelamar');
    if (!old) {
      return res.json({ success: true, message: 'Tidak ada foto untuk dihapus' });
    }
    removeLocalFileIfExists('images', old);
    await pool.execute(
      'UPDATE pelamar_profiles SET profile_photo=NULL, updated_at=NOW() WHERE user_id=?',
      [userId]
    );
    return res.json({ success: true, message: 'Foto profil berhasil dihapus' });
  } catch (e) {
    console.error('❌ DELETE /photo error:', e);
    return res.status(500).json({ success: false, message: 'Gagal menghapus foto profil' });
  }
});

/* ============================================================
   ✅ Endpoint NETRAL untuk SEMUA ROLE (pelamar/hr/admin)
   - Operasi berlaku hanya untuk user yg login (by token)
   - Tidak memengaruhi user lain
   ============================================================ */

// FOTO PROFIL – ANY ROLE
router.post('/me/photo', authenticateToken, acceptPhotoFields, async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    const f = getPickedPhoto(req);
    if (!f) return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });

    // hapus foto lama milik user ini
    const old = await getCurrentPhoto(uid, role);
    removeLocalFileIfExists('images', old);

    // simpan ke tabel sesuai role jika kolom ada
    const stored = await setPhoto(uid, role, f.filename);

    return res.json({
      success: true,
      message: stored ? 'Foto profil berhasil diupload' : 'Foto diupload (URL dikembalikan, DB tidak diubah karena kolom tidak tersedia)',
      filename: f.filename,
      url: buildUploadUrl(req, 'images', f.filename)
    });
  } catch (e) {
    console.error('❌ POST /me/photo error:', e);
    return res.status(500).json({ success: false, message: 'Gagal mengupload foto profil' });
  }
});

router.put('/me/photo', authenticateToken, acceptPhotoFields, async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    const f = getPickedPhoto(req);
    if (!f) return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });

    const old = await getCurrentPhoto(uid, role);
    removeLocalFileIfExists('images', old);

    const stored = await setPhoto(uid, role, f.filename);

    return res.json({
      success: true,
      message: stored ? 'Foto profil berhasil diperbarui' : 'Foto diupload (URL dikembalikan, DB tidak diubah karena kolom tidak tersedia)',
      filename: f.filename,
      url: buildUploadUrl(req, 'images', f.filename)
    });
  } catch (e) {
    console.error('❌ PUT /me/photo error:', e);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui foto profil' });
  }
});

router.delete('/me/photo', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    const old = await getCurrentPhoto(uid, role);
    if (!old) {
      // kalau tak tersimpan di DB (kolom tidak ada), minimal hapus file apa pun tidak bisa karena kita tidak tahu namanya
      return res.json({ success: true, message: 'Tidak ada foto tersimpan untuk user ini' });
    }
    removeLocalFileIfExists('images', old);
    await setPhoto(uid, role, null);
    return res.json({ success: true, message: 'Foto profil berhasil dihapus' });
  } catch (e) {
    console.error('❌ DELETE /me/photo error:', e);
    return res.status(500).json({ success: false, message: 'Gagal menghapus foto profil' });
  }
});

// DOKUMEN – ANY ROLE (disimpan ke DB hanya untuk pelamar)
const uploadDocsAny = upload.fields([
  { name: 'cv_file', maxCount: 1 },
  { name: 'cover_letter_file', maxCount: 1 },
  { name: 'portfolio_file', maxCount: 1 }
]);

async function updatePelamarDocs(uid, files) {
  const sets = [];
  const vals = [];
  if (files.cv_file?.[0])          { sets.push('cv_file=?'); vals.push(files.cv_file[0].filename); }
  if (files.cover_letter_file?.[0]){ sets.push('cover_letter_file=?'); vals.push(files.cover_letter_file[0].filename); }
  if (files.portfolio_file?.[0])   { sets.push('portfolio_file=?'); vals.push(files.portfolio_file[0].filename); }
  if (!sets.length) return false;
  vals.push(uid);
  await pool.execute(`UPDATE pelamar_profiles SET ${sets.join(', ')}, updated_at=NOW() WHERE user_id=?`, vals);
  return true;
}

router.post('/me/files', authenticateToken, uploadDocsAny, async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    const files = req.files || {};

    if (role === 'pelamar') await ensurePelamarProfileExists(uid);
    if (role === 'pelamar') await updatePelamarDocs(uid, files);

    return res.json({
      success: true,
      message: role === 'pelamar' ? 'File berhasil diupload' : 'File diupload (URL dikembalikan, DB tidak diubah)',
      files: {
        cv_file: files.cv_file?.[0]?.filename || null,
        cover_letter_file: files.cover_letter_file?.[0]?.filename || null,
        portfolio_file: files.portfolio_file?.[0]?.filename || null
      },
      urls: {
        cv_file_url: files.cv_file?.[0] ? buildUploadUrl(req, 'files', files.cv_file[0].filename) : null,
        cover_letter_file_url: files.cover_letter_file?.[0] ? buildUploadUrl(req, 'files', files.cover_letter_file[0].filename) : null,
        portfolio_file_url: files.portfolio_file?.[0] ? buildUploadUrl(req, 'files', files.portfolio_file[0].filename) : null
      }
    });
  } catch (e) {
    console.error('❌ POST /me/files error:', e);
    return res.status(500).json({ success: false, message: 'Gagal mengupload file' });
  }
});

router.put('/me/files', authenticateToken, uploadDocsAny, async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    const files = req.files || {};

    if (role === 'pelamar') {
      const [old] = await pool.execute(
        'SELECT cv_file, cover_letter_file, portfolio_file FROM pelamar_profiles WHERE user_id=?',
        [uid]
      );
      const o = old[0] || {};
      if (files.cv_file?.[0] && o.cv_file) {
        removeLocalFileIfExists('files', o.cv_file);
      }
      if (files.cover_letter_file?.[0] && o.cover_letter_file) {
        removeLocalFileIfExists('files', o.cover_letter_file);
      }
      if (files.portfolio_file?.[0] && o.portfolio_file) {
        removeLocalFileIfExists('files', o.portfolio_file);
      }
      await updatePelamarDocs(uid, files);
    }

    return res.json({
      success: true,
      message: role === 'pelamar' ? 'File berhasil diperbarui' : 'File diupload (URL dikembalikan, DB tidak diubah)',
      urls: {
        cv_file_url: files.cv_file?.[0] ? buildUploadUrl(req, 'files', files.cv_file[0].filename) : null,
        cover_letter_file_url: files.cover_letter_file?.[0] ? buildUploadUrl(req, 'files', files.cover_letter_file[0].filename) : null,
        portfolio_file_url: files.portfolio_file?.[0] ? buildUploadUrl(req, 'files', files.portfolio_file[0].filename) : null
      }
    });
  } catch (e) {
    console.error('❌ PUT /me/files error:', e);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui file' });
  }
});

// body JSON: { cv_file:true, cover_letter_file:true, portfolio_file:true }
router.delete('/me/files', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.id;
    const role = req.user.role;
    if (role !== 'pelamar') {
      return res.json({ success: true, message: 'Tidak ada file tersimpan di DB untuk role ini. Abaikan.' });
    }
    const { cv_file, cover_letter_file, portfolio_file } = req.body || {};
    const [old] = await pool.execute(
      'SELECT cv_file, cover_letter_file, portfolio_file FROM pelamar_profiles WHERE user_id=?',
      [uid]
    );
    const o = old[0] || {};
    const sets = [];

    if (cv_file && o.cv_file) {
      removeLocalFileIfExists('files', o.cv_file);
      sets.push('cv_file=NULL');
    }
    if (cover_letter_file && o.cover_letter_file) {
      removeLocalFileIfExists('files', o.cover_letter_file);
      sets.push('cover_letter_file=NULL');
    }
    if (portfolio_file && o.portfolio_file) {
      removeLocalFileIfExists('files', o.portfolio_file);
      sets.push('portfolio_file=NULL');
    }

    if (sets.length) {
      await pool.execute(
        `UPDATE pelamar_profiles SET ${sets.join(', ')}, updated_at=NOW() WHERE user_id=?`,
        [uid]
      );
    }

    return res.json({ success: true, message: 'File berhasil dihapus' });
  } catch (e) {
    console.error('❌ DELETE /me/files error:', e);
    return res.status(500).json({ success: false, message: 'Gagal menghapus file' });
  }
});

module.exports = router;
