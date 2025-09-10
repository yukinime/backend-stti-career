// routes/hr.js
const express = require('express');
const {
    createJobPost,
    getMyJobPosts,
    updateJobPost,
    deleteJobPost,
    getApplications,
    updateApplicationStatus,
    getHRDashboard
} = require('../controllers/hrController');
const { authenticateToken, isHR } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Apply authentication and HR authorization to all routes
router.use(authenticateToken);
router.use(isHR);

// Validation schemas
const jobPostSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().min(10).required(),
    requirements: Joi.string().min(10).required(),
    salary_range: Joi.string().max(100).optional(),
    location: Joi.string().max(255).required(),
    is_active: Joi.boolean().optional().default(true)
});

const updateApplicationStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'rejected').required()
});

// Validation middleware
const validateJobPost = (req, res, next) => {
    const { error } = jobPostSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            error: error.details[0].message
        });
    }
    next();
};

const validateApplicationStatus = (req, res, next) => {
    const { error } = updateApplicationStatusSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            error: error.details[0].message
        });
    }
    next();
};

// HR routes
router.get('/dashboard', getHRDashboard);

// Job posts management
router.post('/jobs', validateJobPost, createJobPost);
router.get('/jobs', getMyJobPosts);
router.put('/jobs/:id', validateJobPost, updateJobPost);
router.delete('/jobs/:id', deleteJobPost);

// Applications management
router.get('/applications', getApplications);
router.patch('/applications/:id/status', validateApplicationStatus, updateApplicationStatus);

module.exports = router;