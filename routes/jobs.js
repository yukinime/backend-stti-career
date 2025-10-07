// routes/jobs.js
const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const pelamarController = require('../controllers/pelamarController');
const { authenticateToken, requireRole, isAdmin } = require('../middleware/auth');
const { applyFilesUpload } = require('../middleware/upload');

/**
 * PUBLIC
 */
router.get('/', jobController.getAllJobs);
router.get('/loker/summary', jobController.getJobSummary);
router.get('/public/:id', jobController.getJobByIdPublic);

/**
 * PELAMAR ACTIONS
 * (letakkan sebelum route param generik)
 */

// Apply job: pelamar apply sendiri, job_id diambil dari :id
router.post(
  '/:id/apply',
  authenticateToken,
  requireRole('pelamar', 'user'),
  applyFilesUpload, // <<----- penting, biar req.files terisi
  (req, res, next) => {
    req.body.job_id = Number(req.params.id);
    return pelamarController.applyForJob(req, res, next);
  }
);

// Tracking lamaran saya (by user login)
router.get(
  '/applied/my',
  authenticateToken,
  requireRole('pelamar', 'user'),
  pelamarController.getMyApplications
);

// ...setelah route tracking & apply, tambahkan:
router.delete(
  '/applications/:id',
  authenticateToken,
  requireRole('pelamar','user'),
  pelamarController.cancelApplication
);

/**
 * DETAIL (login disarankan untuk flags seperti has_applied)
 */
router.get('/details/:id', authenticateToken, jobController.getJobById);
router.get('/:id', authenticateToken, jobController.getJobById);

/**
 * HR ONLY — write operations
 */
router.post('/', authenticateToken, requireRole('hr'), jobController.createJob);
router.put('/:id', authenticateToken, requireRole('hr'), jobController.updateJob);
router.delete('/:id', authenticateToken, requireRole('hr'), jobController.deleteJob);

/**
 * ADMIN ONLY — verify job
 */
router.put('/:id/verify', authenticateToken, isAdmin, jobController.verifyJob);

module.exports = router;
