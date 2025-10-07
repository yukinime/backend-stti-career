// middleware/upload.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsBase = process.env.UPLOADS_DIR || path.resolve('/tmp/uploads');
const filesDir = path.join(uploadsBase, 'files');
fs.mkdirSync(filesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    // contoh: cv_file-<timestamp>-<random>.<ext>
    const field = file.fieldname; // resume_file / cover_letter_file / portfolio_file
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const rand = Math.floor(Math.random() * 1e9);
    const ts = Date.now();
    cb(null, `${field}-${ts}-${rand}${ext}`);
  }
});

// batasi ke dokumen umum (pdf/doc/docx)
const allowed = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) return cb(null, false);
  if (allowed.has(file.mimetype)) return cb(null, true);
  // kalau mau terima image juga: tambahkan mimetype image/*
  return cb(new Error('Tipe file tidak didukung (hanya PDF/DOC/DOCX).'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// accept tiga field file opsional
const applyFilesUpload = upload.fields([
  { name: 'resume_file', maxCount: 1 },
  { name: 'cover_letter_file', maxCount: 1 },
  { name: 'portfolio_file', maxCount: 1 },
]);

module.exports = {
  applyFilesUpload,
};
