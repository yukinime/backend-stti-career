// middleware/upload.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsBase = process.env.UPLOADS_DIR || path.resolve('/tmp/uploads');
const filesDir = path.join(uploadsBase, 'files');
fs.mkdirSync(filesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, filesDir),
  filename: (req, file, cb) => {
    const field = file.fieldname; // resume_file / cover_letter_file / portfolio_file
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const rand = Math.floor(Math.random() * 1e9);
    const ts = Date.now();
    cb(null, `${field}-${ts}-${rand}${ext}`);
  }
});

// Terima PDF/DOC/DOCX (longgar): MIME populer + octet-stream + fallback dari ekstensi
const okMime = (mt = '') => [
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
  /^application\/octet-stream$/  // Postman/Windows sering kirim ini
].some(re => re.test(mt));

const okExt = (fn = '') => ['.pdf', '.doc', '.docx'].includes(path.extname(fn).toLowerCase());

const fileFilter = (req, file, cb) => {
  if (!file) return cb(null, false);
  const pass = okMime(file.mimetype) || okExt(file.originalname || '');
  if (pass) return cb(null, true);
  console.warn('[UPLOAD REJECTED]', { mimetype: file.mimetype, name: file.originalname });
  return cb(new Error('Tipe file tidak didukung (hanya PDF/DOC/DOCX).'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Terima tiga field file opsional
const applyFilesUpload = upload.fields([
  { name: 'resume_file',       maxCount: 1 },
  { name: 'cover_letter_file', maxCount: 1 },
  { name: 'portfolio_file',    maxCount: 1 },
]);

module.exports = { applyFilesUpload };
