// routes/job.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', jobController.getAllJobs);
router.get('/loker/summary', jobController.getJobSummary);

// 🔐 Protected detail routes (butuh login HR supaya req.user ada)
router.get('/details/:id', authenticateToken, jobController.getJobById);
router.get('/:id', authenticateToken, jobController.getJobById);

// Protected routes (require auth)
router.post('/', authenticateToken, jobController.createJob);
router.put('/:id', authenticateToken, jobController.updateJob);
router.delete('/:id', authenticateToken, jobController.deleteJob);

// Admin-only route for verification
router.put('/:id/verify', authenticateToken, isAdmin, jobController.verifyJob);

module.exports = router;
