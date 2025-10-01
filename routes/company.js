const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const multer = require('multer');
const fs = require('fs'); // <--- wajib!
const path = require('path');
const { authenticateToken, requireRole } = require('../middleware/auth');


/* Multer config */
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

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// Get all companies
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

// Upload logo
router.post(
  '/:id/logo',
  authenticateToken,
  requireRole('hr', 'admin'),
  upload.single('logo'),
  companyController.uploadLogo
);

module.exports = router;