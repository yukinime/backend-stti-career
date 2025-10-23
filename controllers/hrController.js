// controllers/hrController.js
const { pool } = require('../config/database');
const { buildUploadUrl } = require('../utils/url');

// Create job post
const createJobPost = async (req, res) => {
    try {
        const { title, description, requirements, salary_range, location, work_type, work_time, salary_min, salary_max } = req.body;
        const hr_id = req.user.id;

        const [result] = await pool.execute(
            `INSERT INTO job_posts 
             (hr_id, title, description, requirements, salary_range, location, work_type, work_time, salary_min, salary_max) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [hr_id, title, description, requirements, salary_range, location, work_type, work_time, salary_min, salary_max]
        );

        // Get created job post
        const [jobPosts] = await pool.execute(
            `SELECT jp.*, u.full_name as hr_name, c.nama_companies as company_name 
             FROM job_posts jp 
             JOIN users u ON jp.hr_id = u.id 
             LEFT JOIN companies c ON jp.company_id = c.id
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
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
            SELECT jp.*, u.full_name as hr_name, c.nama_companies as company_name,
                   COUNT(DISTINCT a.id) as total_applications,
                   SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
                   SUM(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) as accepted_applications,
                   SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
            FROM job_posts jp 
            JOIN users u ON jp.hr_id = u.id 
            LEFT JOIN companies c ON jp.company_id = c.id
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
        const { title, description, requirements, salary_range, location, is_active, work_type, work_time, salary_min, salary_max } = req.body;
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
             salary_range = ?, location = ?, is_active = ?,
             work_type = ?, work_time = ?, salary_min = ?, salary_max = ?
             WHERE id = ? AND hr_id = ?`,
            [title, description, requirements, salary_range, location, is_active, work_type, work_time, salary_min, salary_max, id, hr_id]
        );

        // Get updated job post
        const [updatedJobPost] = await pool.execute(
            `SELECT jp.*, u.full_name as hr_name, c.nama_companies as company_name 
             FROM job_posts jp 
             JOIN users u ON jp.hr_id = u.id 
             LEFT JOIN companies c ON jp.company_id = c.id
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

// Get applications for HR's job posts (ENHANCED VERSION)
const getApplications = async (req, res) => {
    try {
        const { page = 1, limit = 10, job_id, status } = req.query;
        const offset = (page - 1) * limit;
        const hr_id = req.user.id;

        let query = `
            SELECT a.*, 
                   jp.title as job_title,
                   jp.location as job_location,
                   jp.salary_range,
                   c.nama_companies as company_name,
                   p.full_name,
                   p.email,
                   p.phone,
                   p.address,
                   p.city,
                   p.country,
                   p.profile_photo,
                   p.date_of_birth,
                   p.education_level,
                   p.major,
                   p.institution_name,
                   p.gpa,
                   p.graduation_year,
                   p.cv_file,
                   p.cover_letter_file as profile_cover_letter_file,
                   p.portfolio_file as profile_portfolio_file
            FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            JOIN pelamar_profiles p ON a.pelamar_id = p.user_id
            LEFT JOIN companies c ON jp.company_id = c.id
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

        // Build URLs untuk setiap aplikasi
        const applicationsWithUrls = applications.map(app => ({
            ...app,
            profile_photo_url: app.profile_photo 
                ? buildUploadUrl(req, 'images', app.profile_photo) 
                : null,
            cv_file_url: app.cv_file 
                ? buildUploadUrl(req, 'files', app.cv_file) 
                : null,
            profile_cover_letter_url: app.profile_cover_letter_file 
                ? buildUploadUrl(req, 'files', app.profile_cover_letter_file) 
                : null,
            profile_portfolio_url: app.profile_portfolio_file 
                ? buildUploadUrl(req, 'files', app.profile_portfolio_file) 
                : null,
            application_resume_url: app.resume_file 
                ? buildUploadUrl(req, 'files', app.resume_file) 
                : null,
            application_cover_letter_url: app.cover_letter_file 
                ? buildUploadUrl(req, 'files', app.cover_letter_file) 
                : null,
            application_portfolio_url: app.portfolio_file 
                ? buildUploadUrl(req, 'files', app.portfolio_file) 
                : null
        }));

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
                applications: applicationsWithUrls,
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
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
            `SELECT a.id, a.status, jp.title as job_title, p.full_name as applicant_name
             FROM applications a
             JOIN job_posts jp ON a.job_id = jp.id
             JOIN pelamar_profiles p ON a.pelamar_id = p.user_id
             WHERE a.id = ? AND jp.hr_id = ?`,
            [id, hr_id]
        );

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aplikasi tidak ditemukan atau bukan milik perusahaan Anda'
            });
        }

        // Update application status
        await pool.execute(
            'UPDATE applications SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?',
            [status, hr_id, id]
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

        // Get statistics
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT jp.id) as total_job_posts,
                SUM(CASE WHEN jp.is_active = true THEN 1 ELSE 0 END) as active_job_posts,
                SUM(CASE WHEN jp.is_active = false THEN 1 ELSE 0 END) as inactive_job_posts,
                COUNT(DISTINCT a.id) as total_applications,
                SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
                SUM(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) as accepted_applications,
                SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
            FROM job_posts jp
            LEFT JOIN applications a ON jp.id = a.job_id
            WHERE jp.hr_id = ?
        `, [hr_id]);

        // Get recent applications (last 5)
        const [recentApplications] = await pool.execute(`
            SELECT 
                a.id,
                a.status,
                a.applied_at,
                jp.title as job_title,
                p.full_name as applicant_name,
                p.email as applicant_email,
                p.profile_photo
            FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            JOIN pelamar_profiles p ON a.pelamar_id = p.user_id
            WHERE jp.hr_id = ?
            ORDER BY a.applied_at DESC
            LIMIT 5
        `, [hr_id]);

        // Build URLs for recent applications
        const recentWithUrls = recentApplications.map(app => ({
            ...app,
            profile_photo_url: app.profile_photo 
                ? buildUploadUrl(req, 'images', app.profile_photo) 
                : null
        }));

        // Get most active job posts
        const [activeJobs] = await pool.execute(`
            SELECT 
                jp.id,
                jp.title,
                jp.location,
                jp.is_active,
                COUNT(a.id) as application_count
            FROM job_posts jp
            LEFT JOIN applications a ON jp.id = a.job_id
            WHERE jp.hr_id = ?
            GROUP BY jp.id
            ORDER BY application_count DESC
            LIMIT 5
        `, [hr_id]);

        res.json({
            success: true,
            data: {
                statistics: stats[0],
                recent_applications: recentWithUrls,
                most_active_jobs: activeJobs
            }
        });

    } catch (error) {
        console.error('Get HR dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get applicant detail (untuk HR melihat detail pelamar)
const getApplicantDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const hr_id = req.user.id;

        // Verify HR has access to this applicant
        const [access] = await pool.execute(`
            SELECT a.id 
            FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            WHERE a.id = ? AND jp.hr_id = ?
        `, [id, hr_id]);

        if (access.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke pelamar ini'
            });
        }

        // Get applicant details
        const [applications] = await pool.execute(`
            SELECT 
                a.*,
                jp.title as job_title,
                jp.location as job_location,
                jp.salary_range,
                c.nama_companies as company_name,
                p.*,
                p.user_id as pelamar_user_id
            FROM applications a
            JOIN job_posts jp ON a.job_id = jp.id
            JOIN pelamar_profiles p ON a.pelamar_id = p.user_id
            LEFT JOIN companies c ON jp.company_id = c.id
            WHERE a.id = ?
        `, [id]);

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pelamar tidak ditemukan'
            });
        }

        const applicant = applications[0];
        const pelamarUserId = applicant.pelamar_user_id;

        // Get work experiences
        const [workExperiences] = await pool.execute(`
            SELECT * FROM work_experiences 
            WHERE user_id = ? 
            ORDER BY start_date DESC
        `, [pelamarUserId]);

        // Get certificates
        const [certificates] = await pool.execute(`
            SELECT * FROM certificates 
            WHERE user_id = ? 
            ORDER BY issue_date DESC
        `, [pelamarUserId]);

        // Get skills
        const [skills] = await pool.execute(`
            SELECT * FROM skills 
            WHERE user_id = ? 
            ORDER BY skill_name ASC
        `, [pelamarUserId]);

        // Build response with URLs
        const response = {
            ...applicant,
            profile_photo_url: applicant.profile_photo 
                ? buildUploadUrl(req, 'images', applicant.profile_photo) 
                : null,
            cv_file_url: applicant.cv_file 
                ? buildUploadUrl(req, 'files', applicant.cv_file) 
                : null,
            cover_letter_file_url: applicant.cover_letter_file 
                ? buildUploadUrl(req, 'files', applicant.cover_letter_file) 
                : null,
            portfolio_file_url: applicant.portfolio_file 
                ? buildUploadUrl(req, 'files', applicant.portfolio_file) 
                : null,
            application_resume_url: applicant.resume_file 
                ? buildUploadUrl(req, 'files', applicant.resume_file) 
                : null,
            work_experiences: workExperiences,
            certificates: certificates.map(cert => ({
                ...cert,
                certificate_file_url: cert.certificate_file 
                    ? buildUploadUrl(req, 'files', cert.certificate_file) 
                    : null
            })),
            skills: skills
        };

        res.json({
            success: true,
            data: response
        });

    } catch (error) {
        console.error('Get applicant detail error:', error);
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
    getHRDashboard,
    getApplicantDetail
};