// config/paths.js
const path = require('path');

// Semua file akan ikut env ini.
// Jika UPLOADS_DIR tidak di-set, fallback ke <project-root>/uploads
const UPLOADS_BASE =
  process.env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads');

module.exports = {
  UPLOADS_BASE,
  COMPANY_LOGOS_DIR: path.join(UPLOADS_BASE, 'company_logos'),
  FILES_DIR: path.join(UPLOADS_BASE, 'files'),
  IMAGES_DIR: path.join(UPLOADS_BASE, 'images'),
};