// routes/pelamar.js
const express = require('express');
const {
    getJobPosts,
    getJobPostById,
    applyForJob,
    getMyApplications,
    cancelApplication,
    updateProfile,
    getPelamarDashboard
} = require('../controllers/pelamarController');
const { authenticateToken, isPelamar } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const applyJobSchema = Joi.object({
    job_id: Joi.number().integer().positive().required(),
    cover_letter: Joi.string().max(1000).optional()
});

const updateProfileSchema = Joi.object({
    full_name: Joi.string().min(3).max(255).required(),
    address: Joi.string().max(500).required(),
    date_of_birth: Joi.date().iso().required(),
    phone: Joi.string().max(20).optional()
});

// Validation middleware
const validateApplyJob = (req, res, next) => {
    const { error } = applyJobSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            error: error.details[0].message
        });
    }
    next();
};

const validateUpdateProfile = (req, res, next) => {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            error: error.details[0].message
        });
    }
    next();
};

// Public routes (accessible by all authenticated users)
router.get('/jobs', getJobPosts);
router.get('/jobs/:id', getJobPostById);

// Pelamar-specific routes
router.get('/dashboard', isPelamar, getPelamarDashboard);
router.post('/applications', isPelamar, validateApplyJob, applyForJob);
router.get('/applications', isPelamar, getMyApplications);
router.delete('/applications/:id', isPelamar, cancelApplication);
router.put('/profile', isPelamar, validateUpdateProfile, updateProfile);

module.exports = router;