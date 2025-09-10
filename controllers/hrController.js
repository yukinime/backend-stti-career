// controllers/hrController.js
const { pool } = require('../config/database');

// Create job post
const createJobPost = async (req, res) => {
    try {
        const { title, description, requirements, salary_range, location } = req.body;
        const hr_id = req.user.id;

        const [result] = await pool.execute(
            `INSERT INTO job_posts (hr_id, title, description, requirements, salary_range, location) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [hr_id, title, description, requirements, salary_range, location]
        );

        // Get created job post
        const [jobPosts] = await pool.execute(
            `SELECT jp.*, u.full_name as hr_name, u.company_name 
             FROM job_posts jp 
             JOIN users u ON jp.hr_id = u.id 
             WHERE jp.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Lowongan pekerjaan berhasil dibuat',
            data: jobPosts[0]
        });

    } catch (error) {
        console.error('Create job post error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get all job posts by HR
const getMyJobPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = 'all' } = req.query;
        const offset = (page - 1) * limit;
        const hr_id = req.user.id;

        let query = `
            SELECT jp.*, u.full_name as hr_name, u.company_name,
                   COUNT(a.id) as total_applications
            FROM job_posts jp 
            JOIN users u ON jp.hr_id = u.id 
            LEFT JOIN applications a ON jp.id = a.job_id
            WHERE jp.hr_id = ?
        `;
        let params = [hr_id];

        if (status === 'active') {
            query += ' AND jp.is_active = true';
        } else if (status === 'inactive') {
            query += ' AND jp.is_active = false';
        }

        query += ' GROUP BY jp.id ORDER BY jp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [jobPosts] = await pool.execute(query, params);

        // Count total
        let countQuery = 'SELECT COUNT(*) as total FROM job_posts WHERE hr_id = ?';
        let countParams = [hr_id];
        
        if (status === 'active') {
            countQuery += ' AND is_active = true';
        } else if (status === 'inactive') {
            countQuery += ' AND is_active = false';
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
        console.error('Get my job posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Update job post
const updateJobPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, requirements, salary_range, location, is_active } = req.body;
        const hr_id = req.user.id;

        // Check if job post exists and belongs to the HR
        const [jobPosts] = await pool.execute(
            'SELECT id FROM job_posts WHERE id = ? AND hr_id = ?',
            [id, hr_id]
        );

        if (jobPosts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lowongan pekerjaan tidak ditemukan'
            });
        }

        // Update job post
        await pool.execute(
            `UPDATE job_posts SET 
             title = ?, description = ?, requirements = ?, 
             salary_range = ?, location = ?, is_active = ?
             WHERE id = ? AND hr_id = ?`,
            [title, description, requirements, salary_range, location, is_active, id, hr_id]
        );

        // Get updated job post
        const [updatedJobPost] = await pool.execute(
            `SELECT jp.*, u.full_name as hr_name, u.company_name 
             FROM job_posts jp 
             JOIN users u ON jp.hr_id = u.id 
             WHERE jp.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Lowongan pekerjaan berhasil diperbarui',
            data: updatedJobPost[0]
        });

    } catch (error) {
        console.error('Update job post error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Delete job post
const deleteJobPost = async (req, res) => {
    try {
        const { id } = req.params;
        const hr_id = req.user.id;

        // Check if job post exists and belongs to the HR
        const [jobPosts] = await pool.execute(
            'SELECT id, title FROM job_posts WHERE id = ? AND hr_id = ?',
            [id, hr_id]
        );

        if (jobPosts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lowongan pekerjaan tidak ditemukan'
            });
        }

        // Delete job post (will cascade delete applications)
        await pool.execute('DELETE FROM job_posts WHERE id = ? AND hr_id = ?', [id, hr_id]);

        res.json({
            success: true,
            message: 'Lowongan pekerjaan berhasil dihapus',
            data: jobPosts[0]
        });

    } catch (error) {
        console.error('Delete job post error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get applications for HR's job posts
const getApplications = async (req, res) => {
    try {
        const { page = 1, limit = 10, job_id, status } = req.query;
        const offset = (page - 1) * limit;
        const hr_id = req.user.id;

        let query = `
            SELECT a.*, jp.title as job_title, 
                   u.full_name as applicant_name, u.email as applicant_email,
                   u.phone as applicant_phone, u.address as applicant_address
            FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            JOIN users u ON a.pelamar_id = u.id
            WHERE jp.hr_id = ?
        `;
        let params = [hr_id];

        if (job_id) {
            query += ' AND a.job_id = ?';
            params.push(job_id);
        }

        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [applications] = await pool.execute(query, params);

        // Count total
        let countQuery = `
            SELECT COUNT(*) as total FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            WHERE jp.hr_id = ?
        `;
        let countParams = [hr_id];

        if (job_id) {
            countQuery += ' AND a.job_id = ?';
            countParams.push(job_id);
        }

        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            countQuery += ' AND a.status = ?';
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
        console.error('Get applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const hr_id = req.user.id;

        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
            });
        }

        // Check if application exists and belongs to HR's job post
        const [applications] = await pool.execute(
            `SELECT a.id, a.status, jp.title as job_title, u.full_name as applicant_name
             FROM applications a
             JOIN job_posts jp ON a.job_id = jp.id
             JOIN users u ON a.pelamar_id = u.id
             WHERE a.id = ? AND jp.hr_id = ?`,
            [id, hr_id]
        );

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aplikasi tidak ditemukan'
            });
        }

        // Update application status
        await pool.execute(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Status aplikasi berhasil diperbarui',
            data: {
                id: parseInt(id),
                status,
                job_title: applications[0].job_title,
                applicant_name: applications[0].applicant_name
            }
        });

    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get HR dashboard statistics
const getHRDashboard = async (req, res) => {
    try {
        const hr_id = req.user.id;

        const [stats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT jp.id) as total_job_posts,
                SUM(CASE WHEN jp.is_active = true THEN 1 ELSE 0 END) as active_job_posts,
                COUNT(DISTINCT a.id) as total_applications,
                SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
                SUM(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) as accepted_applications,
                SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
            FROM job_posts jp
            LEFT JOIN applications a ON jp.id = a.job_id
            WHERE jp.hr_id = ?
        `, [hr_id]);

        res.json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('Get HR dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    createJobPost,
    getMyJobPosts,
    updateJobPost,
    deleteJobPost,
    getApplications,
    updateApplicationStatus,
    getHRDashboard
};