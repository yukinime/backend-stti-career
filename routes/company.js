// routes/company.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { uploadCompanyLogo } = require('../middleware/logoUpload');

// ===== HR scoped endpoints (PASTIKAN DI ATAS '/:id') =====
router.get('/me',
  authenticateToken,
  requireRole('hr'),
  companyController.getMyCompany
);

router.post('/me/logo',
  authenticateToken,
  requireRole('hr'),
  uploadCompanyLogo,
  companyController.uploadMyCompanyLogo
);

// ===== Generic company endpoints =====
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyController.createCompany);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

router.post('/:id/logo',
  authenticateToken,
  requireRole('hr', 'admin'),
  uploadCompanyLogo,
  companyController.uploadLogo
);

module.exports = router;
