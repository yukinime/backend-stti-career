// routes/admin.js
const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUserStatus,
    deleteUser,
    getDashboardStats
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
router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', validateUpdateUserStatus, updateUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;