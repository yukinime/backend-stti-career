// controllers/pelamarController.js
const { pool } = require('../config/database');

// Get all available job posts
const getJobPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, location } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT jp.*, u.full_name as hr_name, u.company_name,
                   COUNT(a.id) as total_applications
            FROM job_posts jp 
            JOIN users u ON jp.hr_id = u.id 
            LEFT JOIN applications a ON jp.id = a.job_id
            WHERE jp.is_active = true
        `;
        let params = [];

        // Search by title or company
        if (search) {
            query += ' AND (jp.title LIKE ? OR u.company_name LIKE ? OR jp.description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Filter by location
        if (location) {
            query += ' AND jp.location LIKE ?';
            params.push(`%${location}%`);
        }

        query += ' GROUP BY jp.id ORDER BY jp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [jobPosts] = await pool.execute(query, params);

        // Count total
        let countQuery = `
            SELECT COUNT(*) as total FROM job_posts jp 
            JOIN users u ON jp.hr_id = u.id 
            WHERE jp.is_active = true
        `;
        let countParams = [];

        if (search) {
            countQuery += ' AND (jp.title LIKE ? OR u.company_name LIKE ? OR jp.description LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (location) {
            countQuery += ' AND jp.location LIKE ?';
            countParams.push(`%${location}%`);
        }

        const [totalResult] = await pool.execute(countQuery, countParams);
        const total = totalResult[0].total;

        res.json({
            success: true,
            data: {
                job_posts: jobPosts,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get job posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get job post by ID
const getJobPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const pelamar_id = req.user.id;

        const [jobPosts] = await pool.execute(
            `SELECT jp.*, u.full_name as hr_name, u.company_name, u.company_address,
                    EXISTS(SELECT 1 FROM applications WHERE job_id = jp.id AND pelamar_id = ?) as has_applied
             FROM job_posts jp 
             JOIN users u ON jp.hr_id = u.id 
             WHERE jp.id = ? AND jp.is_active = true`,
            [pelamar_id, id]
        );

        if (jobPosts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lowongan pekerjaan tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: jobPosts[0]
        });

    } catch (error) {
        console.error('Get job post by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Apply for a job
const applyForJob = async (req, res) => {
    try {
        const { job_id, cover_letter } = req.body;
        const pelamar_id = req.user.id;

        // Check if job post exists and is active
        const [jobPosts] = await pool.execute(
            'SELECT id, title FROM job_posts WHERE id = ? AND is_active = true',
            [job_id]
        );

        if (jobPosts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lowongan pekerjaan tidak ditemukan atau sudah tidak aktif'
            });
        }

        // Check if user already applied
        const [existingApplication] = await pool.execute(
            'SELECT id FROM applications WHERE job_id = ? AND pelamar_id = ?',
            [job_id, pelamar_id]
        );

        if (existingApplication.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah melamar untuk posisi ini'
            });
        }

        // Create application
        const [result] = await pool.execute(
            'INSERT INTO applications (job_id, pelamar_id, cover_letter) VALUES (?, ?, ?)',
            [job_id, pelamar_id, cover_letter]
        );

        res.status(201).json({
            success: true,
            message: 'Lamaran berhasil dikirim',
            data: {
                application_id: result.insertId,
                job_title: jobPosts[0].title,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Apply for job error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get my applications
const getMyApplications = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;
        const pelamar_id = req.user.id;

        let query = `
            SELECT a.*, jp.title as job_title, jp.location, jp.salary_range,
                   u.full_name as hr_name, u.company_name
            FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            JOIN users u ON jp.hr_id = u.id
            WHERE a.pelamar_id = ?
        `;
        let params = [pelamar_id];

        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [applications] = await pool.execute(query, params);

        // Count total
        let countQuery = 'SELECT COUNT(*) as total FROM applications WHERE pelamar_id = ?';
        let countParams = [pelamar_id];

        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [totalResult] = await pool.execute(countQuery, countParams);
        const total = totalResult[0].total;

        res.json({
            success: true,
            data: {
                applications,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Cancel application (only if status is pending)
const cancelApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const pelamar_id = req.user.id;

        // Check if application exists and belongs to the user
        const [applications] = await pool.execute(
            `SELECT a.id, a.status, jp.title as job_title
             FROM applications a
             JOIN job_posts jp ON a.job_id = jp.id
             WHERE a.id = ? AND a.pelamar_id = ?`,
            [id, pelamar_id]
        );

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aplikasi tidak ditemukan'
            });
        }

        const application = applications[0];

        if (application.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Tidak dapat membatalkan aplikasi yang sudah diproses'
            });
        }

        // Delete application
        await pool.execute('DELETE FROM applications WHERE id = ? AND pelamar_id = ?', [id, pelamar_id]);

        res.json({
            success: true,
            message: 'Aplikasi berhasil dibatalkan',
            data: {
                id: parseInt(id),
                job_title: application.job_title
            }
        });

    } catch (error) {
        console.error('Cancel application error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { full_name, address, date_of_birth, phone } = req.body;
        const pelamar_id = req.user.id;

        // Update profile
        await pool.execute(
            'UPDATE users SET full_name = ?, address = ?, date_of_birth = ?, phone = ? WHERE id = ?',
            [full_name, address, date_of_birth, phone, pelamar_id]
        );

        // Get updated profile
        const [users] = await pool.execute(
            'SELECT id, full_name, email, address, date_of_birth, phone, updated_at FROM users WHERE id = ?',
            [pelamar_id]
        );

        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            data: users[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get pelamar dashboard statistics
const getPelamarDashboard = async (req, res) => {
    try {
        const pelamar_id = req.user.id;

        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_applications,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_applications,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
            FROM applications WHERE pelamar_id = ?
        `, [pelamar_id]);

        // Get available job posts count
        const [jobStats] = await pool.execute(
            'SELECT COUNT(*) as available_jobs FROM job_posts WHERE is_active = true'
        );

        res.json({
            success: true,
            data: {
                ...stats[0],
                available_jobs: jobStats[0].available_jobs
            }
        });

    } catch (error) {
        console.error('Get pelamar dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    getJobPosts,
    getJobPostById,
    applyForJob,
    getMyApplications,
    cancelApplication,
    updateProfile,
    getPelamarDashboard
};