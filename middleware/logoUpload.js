// middleware/logoUpload.js
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { COMPANY_LOGOS_DIR } = require('../config/paths');

fs.mkdirSync(COMPANY_LOGOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COMPANY_LOGOS_DIR),
  filename: (req, file, cb) => {
    const ext  = (path.extname(file.originalname || '').toLowerCase()) || '.png';
    const safe = path.basename(file.originalname || 'logo', ext).replace(/[^\w.-]/g, '_');
    cb(null, `logo-${Date.now()}-${Math.round(Math.random()*1e9)}-${safe}${ext}`);
  },
});

const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const fileFilter = (req, file, cb) => {
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error('Tipe file tidak diizinkan (PNG/JPG/WEBP/GIF).'), false);
};

const uploadCompanyLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('logo');

module.exports = { uploadCompanyLogo };
