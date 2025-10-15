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
const db = require('../config/database'); // ✅ tambahkan ini untuk query statistik manual


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

// ============================
// ✅ Tambahkan route statistik real-time
// ============================
// ============================
// ✅ Real-time Monthly Statistics
// ============================
router.get('/statistics', async (req, res) => {
  try {
    // Users
    const [[usersNow]] = await db.query(`
      SELECT COUNT(*) AS total_now 
      FROM users 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);
    const [[usersPrev]] = await db.query(`
      SELECT COUNT(*) AS total_prev 
      FROM users 
      WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    // Jobs
    const [[jobsNow]] = await db.query(`
      SELECT COUNT(*) AS total_now 
      FROM job_posts 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);
    const [[jobsPrev]] = await db.query(`
      SELECT COUNT(*) AS total_prev 
      FROM job_posts 
      WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    // Applications
    const [[appsNow]] = await db.query(`
      SELECT COUNT(*) AS total_now 
      FROM applications 
      WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);
    const [[appsPrev]] = await db.query(`
      SELECT COUNT(*) AS total_prev 
      FROM applications 
      WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    // Growth calculation
    const calcGrowth = (now, prev) => {
      if (prev === 0 && now > 0) return 100;
      if (prev === 0 && now === 0) return 0;
      return Math.round(((now - prev) / prev) * 100);
    };

    const growth = {
      users: calcGrowth(usersNow.total_now, usersPrev.total_prev),
      jobs: calcGrowth(jobsNow.total_now, jobsPrev.total_prev),
      applications: calcGrowth(appsNow.total_now, appsPrev.total_prev),
    };

    res.json({
      success: true,
      data: {
        users: usersNow.total_now,
        jobs: jobsNow.total_now,
        applications: appsNow.total_now,
        growth,
      },
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin routes
router.get('/dashboard', getDashboardStats);     // Dashboard summary (users, companies, jobs, apps)
router.get('/logs', getActivityLogs);            // Admin activity logs
router.get('/users', getAllUsers);               // List all users
router.get('/users/:id', getUserById);           // Detail user
router.patch('/users/:id/status', validateUpdateUserStatus, updateUserStatus); // Update user active/inactive
router.delete('/users/:id', deleteUser);         // Delete user


module.exports = router;
