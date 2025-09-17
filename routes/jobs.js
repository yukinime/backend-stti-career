// routes/job.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);
router.get('/loker/summary', jobController.getJobSummary);
router.post('/', jobController.createJob);
router.put('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);
router.put('/:id/verify', jobController.verifyJob);
router.get('/details/:id', jobController.getJobDetails);

module.exports = router;