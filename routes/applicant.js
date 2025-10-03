const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET: admin & hr diizinkan
router.get('/', authenticateToken, requireRole('admin','hr'), applicantController.getAllJobApplicants);
router.get('/:id', authenticateToken, requireRole('admin','hr'), applicantController.getJobApplicantById);

// Tulis/ubah/hapus: khusus HR
router.post('/', authenticateToken, requireRole('hr'), applicantController.createJobApplicant);
router.put('/:id', authenticateToken, requireRole('hr'), applicantController.updateJobApplicantStatus);
router.delete('/:id', authenticateToken, requireRole('hr'), applicantController.deleteJobApplicant);

module.exports = router;
