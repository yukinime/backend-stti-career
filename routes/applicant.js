const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');

router.get('/', applicantController.getAllJobApplicants);
router.get('/:id', applicantController.getJobApplicantById);
router.post('/', applicantController.createJobApplicant);
router.put('/:id', applicantController.updateJobApplicantStatus);
router.delete('/:id', applicantController.deleteJobApplicant);

module.exports = router;