// routes/admin.js
const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUserStatus,
    deleteUser,
    getDashboardStats,
    getActivityLogs
} = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Validation schemas
const updateUserStatusSchema = Joi.object({
    is_active: Joi.boolean().required()
});

// Validation middleware
const validateUpdateUserStatus = (req, res, next) => {
    const { error } = updateUserStatusSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            error: error.details[0].message
        });
    }
    next();
};

// Admin routes
router.get('/dashboard', getDashboardStats);     // Dashboard summary (users, companies, jobs, apps)
router.get('/logs', getActivityLogs);            // Admin activity logs
router.get('/users', getAllUsers);               // List all users
router.get('/users/:id', getUserById);           // Detail user
router.patch('/users/:id/status', validateUpdateUserStatus, updateUserStatus); // Update user active/inactive
router.delete('/users/:id', deleteUser);         // Delete user

module.exports = router;
