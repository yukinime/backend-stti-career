// routes/bookmarks.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
    getBookmarks,
    addBookmark,
    removeBookmark,
    removeBookmarkByJobId,
    checkBookmark,
    getBookmarkStats,
    searchBookmarks
} = require('../controllers/bookmarkController');

// Middleware: semua routes membutuhkan authentication dan role pelamar
router.use(authenticateToken);
router.use(requireRole('pelamar'));

/**
 * GET /api/bookmarks/search
 * Search bookmarked jobs with criteria
 * Query params: title, location, company, is_active, page, limit
 * Harus diletakkan sebelum route dengan parameter untuk menghindari konflik
 */
router.get('/search', searchBookmarks);

/**
 * GET /api/bookmarks/stats
 * Get bookmark statistics
 */
router.get('/stats', getBookmarkStats);

/**
 * GET /api/bookmarks/check/:job_id
 * Check if a specific job is bookmarked
 */
router.get('/check/:job_id', checkBookmark);

/**
 * GET /api/bookmarks
 * Get all bookmarked jobs for authenticated pelamar
 * Query params: page, limit
 */
router.get('/', getBookmarks);

/**
 * POST /api/bookmarks
 * Add bookmark for a job
 * Body: { job_id }
 */
router.post('/', addBookmark);

/**
 * DELETE /api/bookmarks/:id
 * Remove bookmark by bookmark ID
 */
router.delete('/:id', removeBookmark);

/**
 * DELETE /api/bookmarks/job/:job_id
 * Remove bookmark by job ID
 */
router.delete('/job/:job_id', removeBookmarkByJobId);

module.exports = router;