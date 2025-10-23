// routes/applicant.js
const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper function untuk multiple roles
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User tidak terautentikasi' 
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role yang diizinkan: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// 🔹 Pelamar: Get lamaran sendiri
router.get('/me', 
  authenticateToken, 
  allowRoles('pelamar'), 
  applicantController.getMyApplications
);

// 🔹 HR/Admin: Get all applicants dengan filter
// PENTING: HR hanya akan melihat pelamar untuk job posts miliknya
router.get('/', 
  authenticateToken, 
  allowRoles('admin', 'hr'), 
  applicantController.getAllJobApplicants
);

// 🔹 HR/Admin: Get detail lengkap applicant by ID
router.get('/:id', 
  authenticateToken, 
  allowRoles('admin', 'hr'), 
  applicantController.getJobApplicantById
);

// 🔹 Pelamar/HR: Create application (pelamar apply, atau HR input manual)
router.post('/', 
  authenticateToken, 
  allowRoles('hr', 'pelamar'), 
  applicantController.createJobApplicant
);

// 🔹 HR/Admin: Update status lamaran
router.put('/:id', 
  authenticateToken, 
  allowRoles('hr', 'admin'), 
  applicantController.updateJobApplicantStatus
);

// 🔹 HR/Admin: Delete lamaran
router.delete('/:id', 
  authenticateToken, 
  allowRoles('hr', 'admin'), 
  applicantController.deleteJobApplicant
);

module.exports = router;