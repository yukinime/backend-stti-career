// controllers/bookmarkController.js
const {pool} = require('../config/database');

/**
 * Get all bookmarked jobs for authenticated user
 * GET /api/bookmarks
 */
const getBookmarks = async (req, res) => {
    try {
        // 1) pastikan req.user.id ada & angka
        if (!req.user || req.user.id === undefined || req.user.id === null) {
        return res.status(401).json({ success: false, message: 'User tidak terautentikasi' });
        }
        const userId = Number(req.user.id);
        if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, message: 'User ID tidak valid' });
        }

        // 2) page/limit -> integer valid (fallback aman)
        const pageRaw = Number.parseInt(req.query.page, 10);
        const limitRaw = Number.parseInt(req.query.limit, 10);
        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10;
        const offset = (page - 1) * limit;
        
        console.log('DBG /bookmarks', { userId, page, limit, offset });
        // Query untuk mendapatkan bookmarks dengan detail job posts
                const sql = `
                   SELECT 
                b.id as bookmark_id,
                b.user_id,
                b.job_id,
                b.created_at as bookmarked_at,
                jp.id as job_post_id,
                jp.title,
                jp.description,
                jp.requirements,
                jp.salary_range,
                jp.location,
                jp.is_active,
                jp.created_at as job_created_at,
                jp.updated_at as job_updated_at,
                u.full_name as hr_name,
                u.company_name,
                COUNT(*) OVER() as total_count
                FROM bookmarks b
                LEFT JOIN job_posts jp ON b.job_id = jp.id
                LEFT JOIN users u ON jp.hr_id = u.id
                WHERE b.user_id = ?
                ORDER BY b.created_at DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

             const [bookmarkedJobs] = await pool.query(sql, [userId]);

        // Hitung total pages
        const totalCount = bookmarkedJobs.length > 0 ? Number(bookmarkedJobs[0].total_count) || 0 : 0;
        const totalPages = Math.ceil(totalCount / limit);

        // Format response data
        const formattedJobs = bookmarkedJobs.map(job => ({
            bookmark_id: job.bookmark_id,
            user_id: job.user_id,
            job_id: job.job_id,
            bookmarked_at: job.bookmarked_at,
            job_post: job.job_post_id ? {
                id: job.job_post_id,
                title: job.title,
                description: job.description,
                requirements: job.requirements,
                salary_range: job.salary_range,
                location: job.location,
                is_active: job.is_active,
                created_at: job.job_created_at,
                updated_at: job.job_updated_at,
                hr_info: {
                    name: job.hr_name,
                    company_name: job.company_name
                }
            } : null
        }));

        res.json({
            success: true,
            message: 'Berhasil mendapatkan daftar bookmark',
            data: {
                bookmarks: formattedJobs,
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_items: totalCount,
                    items_per_page: limit,
                    has_next_page: page < totalPages,
                    has_prev_page: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Error getting bookmarks:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mendapatkan daftar bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Add bookmark (save a job)
 * POST /api/bookmarks
 */
const addBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_id } = req.body;

        // Validasi input
        if (!job_id) {
            return res.status(400).json({
                success: false,
                message: 'ID lowongan diperlukan'
            });
        }

        // Cek apakah job post exists dan masih aktif
        const [jobPost] = await pool.execute(
            'SELECT id, title, is_active, hr_id FROM job_posts WHERE id = ?',
            [job_id]
        );

        if (jobPost.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lowongan tidak ditemukan'
            });
        }

        if (!jobPost[0].is_active) {
            return res.status(400).json({
                success: false,
                message: 'Lowongan sudah tidak aktif'
            });
        }

        // Cek apakah user bukan HR yang membuat job post tersebut
        if (jobPost[0].hr_id === userId) {
            return res.status(400).json({
                success: false,
                message: 'Tidak dapat mem-bookmark lowongan sendiri'
            });
        }

        // Cek apakah sudah pernah di-bookmark sebelumnya
        const [existing] = await pool.execute(
            'SELECT id FROM bookmarks WHERE user_id = ? AND job_id = ?',
            [userId, job_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Lowongan sudah di-bookmark sebelumnya'
            });
        }

        // Tambah bookmark
        const [result] = await pool.execute(
            'INSERT INTO bookmarks (user_id, job_id) VALUES (?, ?)',
            [userId, job_id]
        );

        // Get the bookmarked job with details
        const [bookmarkedJob] = await pool.execute(`
            SELECT 
                b.id as bookmark_id,
                b.user_id,
                b.job_id,
                b.created_at as bookmarked_at,
                jp.title,
                jp.salary_range,
                jp.location,
                u.company_name
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            LEFT JOIN users u ON jp.hr_id = u.id
            WHERE b.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: `Lowongan "${jobPost[0].title}" berhasil di-bookmark`,
            data: {
                bookmark_id: bookmarkedJob[0].bookmark_id,
                user_id: bookmarkedJob[0].user_id,
                job_id: bookmarkedJob[0].job_id,
                bookmarked_at: bookmarkedJob[0].bookmarked_at,
                job_info: {
                    title: bookmarkedJob[0].title,
                    salary_range: bookmarkedJob[0].salary_range,
                    location: bookmarkedJob[0].location,
                    company_name: bookmarkedJob[0].company_name
                }
            }
        });

    } catch (error) {
        console.error('Error adding bookmark:', error);
        
        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Lowongan sudah di-bookmark sebelumnya'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Remove bookmark by bookmark ID
 * DELETE /api/bookmarks/:id
 */
const removeBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Validasi ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: 'ID bookmark tidak valid'
            });
        }

        // Cek apakah bookmark exists dan milik user
        const [existing] = await pool.execute(`
            SELECT 
                b.id,
                b.user_id,
                b.job_id,
                jp.title,
                u.company_name
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            LEFT JOIN users u ON jp.hr_id = u.id
            WHERE b.id = ? AND b.user_id = ?
        `, [id, userId]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Bookmark tidak ditemukan'
            });
        }

        // Hapus bookmark
        await pool.execute(
            'DELETE FROM bookmarks WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        res.json({
            success: true,
            message: `Bookmark untuk lowongan "${existing[0].title}" berhasil dihapus`,
            data: {
                deleted_bookmark_id: parseInt(id),
                job_id: existing[0].job_id,
                job_title: existing[0].title,
                company_name: existing[0].company_name
            }
        });

    } catch (error) {
        console.error('Error removing bookmark:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Remove bookmark by job ID
 * DELETE /api/bookmarks/job/:job_id
 */
const removeBookmarkByJobId = async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_id } = req.params;

        // Validasi job_id
        if (!job_id || isNaN(parseInt(job_id))) {
            return res.status(400).json({
                success: false,
                message: 'ID lowongan tidak valid'
            });
        }

        // Cek apakah bookmark exists
        const [existing] = await pool.execute(`
            SELECT 
                b.id as bookmark_id,
                jp.title,
                u.company_name
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            LEFT JOIN users u ON jp.hr_id = u.id
            WHERE b.user_id = ? AND b.job_id = ?
        `, [userId, job_id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lowongan belum di-bookmark sebelumnya'
            });
        }

        // Hapus bookmark
        await pool.execute(
            'DELETE FROM bookmarks WHERE user_id = ? AND job_id = ?',
            [userId, job_id]
        );

        res.json({
            success: true,
            message: `Bookmark untuk lowongan "${existing[0].title}" berhasil dihapus`,
            data: {
                deleted_bookmark_id: existing[0].bookmark_id,
                job_id: parseInt(job_id),
                job_title: existing[0].title,
                company_name: existing[0].company_name
            }
        });

    } catch (error) {
        console.error('Error removing bookmark by job_id:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Check if a job is bookmarked
 * GET /api/bookmarks/check/:job_id
 */
const checkBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_id } = req.params;

        // Validasi job_id
        if (!job_id || isNaN(parseInt(job_id))) {
            return res.status(400).json({
                success: false,
                message: 'ID lowongan tidak valid'
            });
        }

        // Cek apakah job sudah di-bookmark
        const [bookmark] = await pool.execute(
            'SELECT id, created_at FROM bookmarks WHERE user_id = ? AND job_id = ?',
            [userId, job_id]
        );

        res.json({
            success: true,
            data: {
                job_id: parseInt(job_id),
                is_bookmarked: bookmark.length > 0,
                bookmarked_at: bookmark.length > 0 ? bookmark[0].created_at : null,
                bookmark_id: bookmark.length > 0 ? bookmark[0].id : null
            }
        });

    } catch (error) {
        console.error('Error checking bookmark:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengecek status bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get bookmark statistics
 * GET /api/bookmarks/stats
 */
const getBookmarkStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get total bookmarks
        const [totalResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM bookmarks WHERE user_id = ?',
            [userId]
        );

        // Get bookmarks by location
        const [locationStats] = await pool.execute(`
            SELECT 
                jp.location,
                COUNT(*) as count
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            WHERE b.user_id = ? AND jp.location IS NOT NULL
            GROUP BY jp.location
            ORDER BY count DESC
            LIMIT 10
        `, [userId]);

        // Get bookmarks by company
        const [companyStats] = await pool.execute(`
            SELECT 
                u.company_name,
                COUNT(*) as count
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            LEFT JOIN users u ON jp.hr_id = u.id
            WHERE b.user_id = ? AND u.company_name IS NOT NULL
            GROUP BY u.company_name
            ORDER BY count DESC
            LIMIT 10
        `, [userId]);

        // Get recent bookmarks (last 30 days)
        const [recentStats] = await pool.execute(`
            SELECT COUNT(*) as recent_count
            FROM bookmarks 
            WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [userId]);

        // Get active vs inactive job posts
        const [statusStats] = await pool.execute(`
            SELECT 
                jp.is_active,
                COUNT(*) as count
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            WHERE b.user_id = ?
            GROUP BY jp.is_active
        `, [userId]);

        const activeCount = statusStats.find(s => s.is_active === 1)?.count || 0;
        const inactiveCount = statusStats.find(s => s.is_active === 0)?.count || 0;

        res.json({
            success: true,
            data: {
                total_bookmarks: totalResult[0].total,
                recent_bookmarks_30_days: recentStats[0].recent_count,
                active_job_posts: activeCount,
                inactive_job_posts: inactiveCount,
                by_location: locationStats,
                by_company: companyStats,
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting bookmark stats:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mendapatkan statistik bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get bookmarked jobs by specific criteria
 * GET /api/bookmarks/search
 */
const searchBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            title, 
            location, 
            company, 
            is_active, 
            page = 1, 
            limit = 10 
        } = req.query;

            const pageRaw = Number.parseInt(page, 10);
            const limitRaw = Number.parseInt(limit, 10);
            const pageNum = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
            const limitNum = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10;
            const offset = (pageNum - 1) * limitNum;

        // Build WHERE conditions
        let whereConditions = ['b.user_id = ?'];
        let queryParams = [userId];

        if (title) {
            whereConditions.push('jp.title LIKE ?');
            queryParams.push(`%${title}%`);
        }

        if (location) {
            whereConditions.push('jp.location LIKE ?');
            queryParams.push(`%${location}%`);
        }

        if (company) {
            whereConditions.push('u.company_name LIKE ?');
            queryParams.push(`%${company}%`);
        }

        if (is_active !== undefined) {
            whereConditions.push('jp.is_active = ?');
            queryParams.push(is_active === 'true' ? 1 : 0);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get bookmarks with search criteria
        const [searchResults] = await pool.execute(`
            SELECT 
                b.id as bookmark_id,
                b.user_id,
                b.job_id,
                b.created_at as bookmarked_at,
                jp.id as job_post_id,
                jp.title,
                jp.description,
                jp.requirements,
                jp.salary_range,
                jp.location,
                jp.is_active,
                jp.created_at as job_created_at,
                jp.updated_at as job_updated_at,
                u.full_name as hr_name,
                u.company_name,
                COUNT(*) OVER() as total_count
            FROM bookmarks b
            LEFT JOIN job_posts jp ON b.job_id = jp.id
            LEFT JOIN users u ON jp.hr_id = u.id
            WHERE ${whereClause}
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limitNum, offset]);

        const totalCount = searchResults.length > 0 ? searchResults[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / limitNum);

        // Format response data
        const formattedResults = searchResults.map(job => ({
            bookmark_id: job.bookmark_id,
            user_id: job.user_id,
            job_id: job.job_id,
            bookmarked_at: job.bookmarked_at,
            job_post: job.job_post_id ? {
                id: job.job_post_id,
                title: job.title,
                description: job.description,
                requirements: job.requirements,
                salary_range: job.salary_range,
                location: job.location,
                is_active: job.is_active,
                created_at: job.job_created_at,
                updated_at: job.job_updated_at,
                hr_info: {
                    name: job.hr_name,
                    company_name: job.company_name
                }
            } : null
        }));

        res.json({
            success: true,
            message: 'Berhasil mencari bookmark',
            data: {
                bookmarks: formattedResults,
                search_criteria: {
                    title,
                    location,
                    company,
                    is_active
                },
                pagination: {
                    current_page: pageNum,
                    total_pages: totalPages,
                    total_items: totalCount,
                    items_per_page: limitNum,
                    has_next_page: pageNum < totalPages,
                    has_prev_page: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('Error searching bookmarks:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencari bookmark',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getBookmarks,
    addBookmark,
    removeBookmark,
    removeBookmarkByJobId,
    checkBookmark,
    getBookmarkStats,
    searchBookmarks
};