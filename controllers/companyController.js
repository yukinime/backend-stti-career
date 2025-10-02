const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const express = require('express');
const router = express.Router();

/* ===========================
   Multer konfigurasi
=========================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'company_logos');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeName}`);
  }
});

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('File type not allowed'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

// Mendapatkan semua perusahaan
exports.getAllCompanies = async (req, res) => {
  try {
    const [rows, fields] = await db.query('SELECT * FROM companies');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Mendapatkan perusahaan berdasarkan ID
exports.getCompanyById = async (req, res) => {
  const companyId = req.params.id;
  try {
    const [rows, fields] = await db.query('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

/* ===========================
   Upload Logo Perusahaan
=========================== */
exports.uploadLogo = async (req, res) => {
  try {
    const companyId = req.params.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'File logo wajib diupload' });
    }

    // cek apakah perusahaan ada
    const [rows] = await db.query('SELECT logo FROM companies WHERE id = ?', [companyId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Company not found' });

    // hapus logo lama jika ada
    const oldLogo = rows[0].logo;
    if (oldLogo) {
      const oldPath = path.join(process.cwd(), 'uploads', 'company_logos', oldLogo);
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengupload logo perusahaan' });
  }
};



// Membuat perusahaan baru
exports.createCompany = async (req, res) => {
  const { nama_companies, email_companies, nomor_telepon, website, alamat, logo } = req.body;

  // Validasi field wajib
  if (!nama_companies || !email_companies) {
    return res.status(400).json({
      success: false,
      message: 'Nama perusahaan dan email perusahaan wajib diisi',
      missing: {
        nama_companies: !nama_companies,
        email_companies: !email_companies
      }
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO companies 
        (nama_companies, email_companies, nomor_telepon, website, alamat, logo) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama_companies, email_companies, nomor_telepon, website, alamat, logo]
    );

    return res.status(201).json({
      success: true,
      message: 'Perusahaan berhasil dibuat',
      data: {
        id_companies: result.insertId,
        nama_companies,
        email_companies,
        nomor_telepon,
        website,
        alamat,
        logo
      }
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Email perusahaan sudah terdaftar',
        field: 'email_companies'
      });
    }

    console.error('[createCompany] Database Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

// Mengupdate perusahaan berdasarkan ID
exports.updateCompany = async (req, res) => {
  const companyId = req.params.id;
  const { nama_companies, email_companies, nomor_telepon, website, alamat, logo } = req.body;

  if (!nama_companies || !email_companies) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await db.query(
      'UPDATE companies SET nama_companies = ?, email_companies = ?, nomor_telepon = ?, website = ?, alamat = ?, logo = ? WHERE id = ?',
      [nama_companies, email_companies, nomor_telepon, website, alamat, logo, companyId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Menghapus perusahaan berdasarkan ID
exports.deleteCompany = async (req, res) => {
  const companyId = req.params.id;
  try {
    const [result] = await db.query('DELETE FROM companies WHERE id = ?', [companyId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};