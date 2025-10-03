// routes/job.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, requireRole, isAdmin } = require('../middleware/auth');

// Public
router.get('/', jobController.getAllJobs);
router.get('/loker/summary', jobController.getJobSummary);

// Detail (butuh login supaya req.user ada untuk cek kepemilikan)
router.get('/details/:id', authenticateToken, jobController.getJobById);
router.get('/:id', authenticateToken, jobController.getJobById);

// Write: khusus HR
router.post('/', authenticateToken, requireRole('hr'), jobController.createJob);
router.put('/:id', authenticateToken, requireRole('hr'), jobController.updateJob);
router.delete('/:id', authenticateToken, requireRole('hr'), jobController.deleteJob);

// Verifikasi: khusus admin
router.put('/:id/verify', authenticateToken, isAdmin, jobController.verifyJob);

module.exports = router;
