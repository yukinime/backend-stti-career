// routes/profile.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { pool } = require('../config/database');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
};

ensureDirectoryExists('./uploads/files');
ensureDirectoryExists('./uploads/images');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;
        
        // Determine upload path based on file type
        if (file.mimetype.startsWith('image/')) {
            uploadPath = './uploads/images';
        } else {
            uploadPath = './uploads/files';
        }
        
        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow images and documents
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Utility function to ensure pelamar profile exists
const ensurePelamarProfileExists = async (userId) => {
    try {
        // Check if profile exists
        const [existing] = await pool.execute(
            'SELECT id FROM pelamar_profiles WHERE user_id = ?',
            [userId]
        );

        if (existing.length === 0) {
            // Get user data to create profile
            const [userData] = await pool.execute(
                'SELECT full_name, email, phone, address, date_of_birth FROM users WHERE id = ?',
                [userId]
            );

            if (userData.length > 0) {
                const user = userData[0];
                
                // Create pelamar profile
                await pool.execute(
                    `INSERT INTO pelamar_profiles 
                     (user_id, full_name, email, phone, address, date_of_birth) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, user.full_name, user.email, user.phone, user.address, user.date_of_birth]
                );
                
                console.log(`✅ Created pelamar profile for user ID: ${userId}`);
            }
        }
        return true;
    } catch (error) {
        console.error('Error ensuring pelamar profile exists:', error);
        return false;
    }
};

// GET /api/profile - Get user profile data
router.get('/', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📋 Fetching profile for user ID: ${userId}`);
        
        // Ensure pelamar profile exists
        await ensurePelamarProfileExists(userId);
        
        // Get basic profile data
        const [profileRows] = await pool.execute(
            `SELECT pp.*, u.created_at as user_created_at 
             FROM pelamar_profiles pp 
             LEFT JOIN users u ON pp.user_id = u.id 
             WHERE pp.user_id = ?`,
            [userId]
        );
        
        console.log(`📄 Profile rows found: ${profileRows.length}`);
        
        if (profileRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profil pelamar tidak ditemukan'
            });
        }
        
        // Get work experiences
        const [workExp] = await pool.execute(
            'SELECT * FROM work_experiences WHERE user_id = ? ORDER BY start_date DESC',
            [userId]
        );
        
        // Get certificates
        const [certificates] = await pool.execute(
            'SELECT * FROM certificates WHERE user_id = ? ORDER BY issue_date DESC',
            [userId]
        );
        
        // Get skills
        const [skills] = await pool.execute(
            'SELECT * FROM skills WHERE user_id = ? ORDER BY skill_name ASC',
            [userId]
        );
        
        const profile = profileRows[0];
        
        console.log(`✅ Profile data retrieved successfully for user ${userId}`);
        
        res.json({
            success: true,
            message: 'Data profil berhasil diambil',
            data: {
                ...profile,
                work_experiences: workExp,
                certificates: certificates,
                skills: skills
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data profil',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/profile/biodata - Update biodata
router.put('/biodata', authenticateToken, requireRole('pelamar'), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const userId = req.user.id;
        const {
            full_name,
            email,
            phone,
            address,
            city,
            country
        } = req.body;
        
        console.log(`📝 Updating biodata for user ID: ${userId}`);
        
        // Ensure profile exists
        await ensurePelamarProfileExists(userId);
        
        // Update pelamar profile
        await connection.execute(
            `UPDATE pelamar_profiles 
             SET full_name = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, updated_at = NOW()
             WHERE user_id = ?`,
            [full_name, email, phone, address, city, country, userId]
        );
        
        // Also update users table
        await connection.execute(
            'UPDATE users SET full_name = ?, email = ?, phone = ?, address = ?, updated_at = NOW() WHERE id = ?',
            [full_name, email, phone, address, userId]
        );
        
        await connection.commit();
        
        console.log(`✅ Biodata updated successfully for user ${userId}`);
        
        res.json({
            success: true,
            message: 'Data biodata berhasil diperbarui'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error updating biodata:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data biodata',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// PUT /api/profile/education - Update education data
router.put('/education', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            education_level,
            major,
            institution_name,
            gpa,
            entry_year,
            graduation_year
        } = req.body;
        
        console.log(`🎓 Updating education data for user ID: ${userId}`);
        
        // Ensure profile exists
        await ensurePelamarProfileExists(userId);
        
        await pool.execute(
            `UPDATE pelamar_profiles 
             SET education_level = ?, major = ?, institution_name = ?, gpa = ?, 
                 entry_year = ?, graduation_year = ?, updated_at = NOW()
             WHERE user_id = ?`,
            [education_level, major, institution_name, gpa, entry_year, graduation_year, userId]
        );
        
        console.log(`✅ Education data updated successfully for user ${userId}`);
        
        res.json({
            success: true,
            message: 'Data pendidikan berhasil diperbarui'
        });
        
    } catch (error) {
        console.error('❌ Error updating education:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data pendidikan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/profile/work-experience - Add work experience
router.post('/work-experience', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            company_name,
            position,
            start_date,
            end_date,
            is_current,
            job_description
        } = req.body;
        
        console.log(`💼 Adding work experience for user ID: ${userId}`);
        
        const [result] = await pool.execute(
            `INSERT INTO work_experiences 
             (user_id, company_name, position, start_date, end_date, is_current, job_description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, company_name, position, start_date, end_date || null, is_current, job_description]
        );
        
        console.log(`✅ Work experience added successfully with ID: ${result.insertId}`);
        
        res.json({
            success: true,
            message: 'Pengalaman kerja berhasil ditambahkan',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('❌ Error adding work experience:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan pengalaman kerja',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/profile/work-experience/:id - Update work experience
router.put('/work-experience/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const experienceId = req.params.id;
        const {
            company_name,
            position,
            start_date,
            end_date,
            is_current,
            job_description
        } = req.body;
        
        console.log(`📝 Updating work experience ID: ${experienceId} for user ID: ${userId}`);
        
        const [result] = await pool.execute(
            `UPDATE work_experiences 
             SET company_name = ?, position = ?, start_date = ?, end_date = ?, 
                 is_current = ?, job_description = ?, updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [company_name, position, start_date, end_date || null, is_current, job_description, experienceId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pengalaman kerja tidak ditemukan'
            });
        }
        
        console.log(`✅ Work experience updated successfully`);
        
        res.json({
            success: true,
            message: 'Pengalaman kerja berhasil diperbarui'
        });
        
    } catch (error) {
        console.error('❌ Error updating work experience:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui pengalaman kerja',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/profile/work-experience/:id - Delete work experience
router.delete('/work-experience/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const experienceId = req.params.id;
        
        console.log(`🗑️ Deleting work experience ID: ${experienceId} for user ID: ${userId}`);
        
        const [result] = await pool.execute(
            'DELETE FROM work_experiences WHERE id = ? AND user_id = ?',
            [experienceId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pengalaman kerja tidak ditemukan'
            });
        }
        
        console.log(`✅ Work experience deleted successfully`);
        
        res.json({
            success: true,
            message: 'Pengalaman kerja berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting work experience:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus pengalaman kerja',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/profile/certificate - Add certificate
router.post('/certificate', authenticateToken, requireRole('pelamar'), upload.single('certificate_file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            certificate_name,
            issuer,
            issue_date,
            expiry_date
        } = req.body;
        
        const certificateFile = req.file ? req.file.filename : null;
        
        console.log(`📜 Adding certificate for user ID: ${userId}`);
        
        const [result] = await pool.execute(
            `INSERT INTO certificates 
             (user_id, certificate_name, issuer, issue_date, expiry_date, certificate_file)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, certificate_name, issuer, issue_date, expiry_date || null, certificateFile]
        );
        
        console.log(`✅ Certificate added successfully with ID: ${result.insertId}`);
        
        res.json({
            success: true,
            message: 'Sertifikat berhasil ditambahkan',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('❌ Error adding certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan sertifikat',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/profile/certificate/:id - Update certificate
router.put('/certificate/:id', authenticateToken, requireRole('pelamar'), upload.single('certificate_file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const certificateId = req.params.id;
        const {
            certificate_name,
            issuer,
            issue_date,
            expiry_date
        } = req.body;
        
        console.log(`📝 Updating certificate ID: ${certificateId} for user ID: ${userId}`);
        
        let updateQuery = `UPDATE certificates 
                          SET certificate_name = ?, issuer = ?, issue_date = ?, expiry_date = ?, updated_at = NOW()`;
        let updateParams = [certificate_name, issuer, issue_date, expiry_date || null];
        
        // If new file uploaded
        if (req.file) {
            // Delete old file
            const [oldCert] = await pool.execute(
                'SELECT certificate_file FROM certificates WHERE id = ? AND user_id = ?',
                [certificateId, userId]
            );
            
            if (oldCert[0]?.certificate_file) {
                const oldFilePath = path.join('./uploads/files', oldCert[0].certificate_file);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                    console.log(`🗑️ Deleted old certificate file: ${oldCert[0].certificate_file}`);
                }
            }
            
            updateQuery += ', certificate_file = ?';
            updateParams.push(req.file.filename);
        }
        
        updateQuery += ' WHERE id = ? AND user_id = ?';
        updateParams.push(certificateId, userId);
        
        const [result] = await pool.execute(updateQuery, updateParams);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sertifikat tidak ditemukan'
            });
        }
        
        console.log(`✅ Certificate updated successfully`);
        
        res.json({
            success: true,
            message: 'Sertifikat berhasil diperbarui'
        });
        
    } catch (error) {
        console.error('❌ Error updating certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui sertifikat',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/profile/certificate/:id - Delete certificate
router.delete('/certificate/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const certificateId = req.params.id;
        
        console.log(`🗑️ Deleting certificate ID: ${certificateId} for user ID: ${userId}`);
        
        // Get file info before deleting
        const [certificate] = await pool.execute(
            'SELECT certificate_file FROM certificates WHERE id = ? AND user_id = ?',
            [certificateId, userId]
        );
        
        if (certificate.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sertifikat tidak ditemukan'
            });
        }
        
        // Delete file if exists
        if (certificate[0]?.certificate_file) {
            const filePath = path.join('./uploads/files', certificate[0].certificate_file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted certificate file: ${certificate[0].certificate_file}`);
            }
        }
        
        // Delete from database
        await pool.execute(
            'DELETE FROM certificates WHERE id = ? AND user_id = ?',
            [certificateId, userId]
        );
        
        console.log(`✅ Certificate deleted successfully`);
        
        res.json({
            success: true,
            message: 'Sertifikat berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus sertifikat',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/profile/upload-files - Upload multiple files (CV, Cover Letter, Portfolio)
router.post('/upload-files', authenticateToken, requireRole('pelamar'), upload.fields([
    { name: 'cv_file', maxCount: 1 },
    { name: 'cover_letter_file', maxCount: 1 },
    { name: 'portfolio_file', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = req.user.id;
        const files = req.files;
        
        console.log(`📁 Uploading files for user ID: ${userId}`);
        
        // Ensure profile exists
        await ensurePelamarProfileExists(userId);
        
        let updateFields = [];
        let updateValues = [];
        
        // Check each file type
        if (files.cv_file) {
            updateFields.push('cv_file = ?');
            updateValues.push(files.cv_file[0].filename);
            console.log(`📄 CV file uploaded: ${files.cv_file[0].filename}`);
        }
        
        if (files.cover_letter_file) {
            updateFields.push('cover_letter_file = ?');
            updateValues.push(files.cover_letter_file[0].filename);
            console.log(`📝 Cover letter file uploaded: ${files.cover_letter_file[0].filename}`);
        }
        
        if (files.portfolio_file) {
            updateFields.push('portfolio_file = ?');
            updateValues.push(files.portfolio_file[0].filename);
            console.log(`🎨 Portfolio file uploaded: ${files.portfolio_file[0].filename}`);
        }
        
        if (updateFields.length > 0) {
            updateFields.push('updated_at = NOW()');
            updateValues.push(userId);
            
            await pool.execute(
                `UPDATE pelamar_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
                updateValues
            );
        }
        
        console.log(`✅ Files uploaded successfully for user ${userId}`);
        
        res.json({
            success: true,
            message: 'File berhasil diupload',
            uploaded_files: Object.keys(files)
        });
        
    } catch (error) {
        console.error('❌ Error uploading files:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupload file',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/profile/upload-photo - Upload profile photo
router.post('/upload-photo', authenticateToken, requireRole('pelamar'), upload.single('profile_photo'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`📷 Uploading profile photo for user ID: ${userId}`);
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada file yang diupload'
            });
        }
        
        // Ensure profile exists
        await ensurePelamarProfileExists(userId);
        
        // Delete old profile photo if exists
        const [oldProfile] = await pool.execute(
            'SELECT profile_photo FROM pelamar_profiles WHERE user_id = ?',
            [userId]
        );
        
        if (oldProfile[0]?.profile_photo) {
            const oldPhotoPath = path.join('./uploads/images', oldProfile[0].profile_photo);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                console.log(`🗑️ Deleted old profile photo: ${oldProfile[0].profile_photo}`);
            }
        }
        
        // Update profile photo
        await pool.execute(
            'UPDATE pelamar_profiles SET profile_photo = ?, updated_at = NOW() WHERE user_id = ?',
            [req.file.filename, userId]
        );
        
        console.log(`✅ Profile photo uploaded successfully: ${req.file.filename}`);
        
        res.json({
            success: true,
            message: 'Foto profil berhasil diupload',
            filename: req.file.filename,
            url: `/uploads/images/${req.file.filename}`
        });
        
    } catch (error) {
        console.error('❌ Error uploading profile photo:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupload foto profil',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/profile/skill - Add skill
router.post('/skill', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { skill_name, skill_level } = req.body;
        
        console.log(`🛠️ Adding skill for user ID: ${userId}`);
        
        if (!skill_name || !skill_level) {
            return res.status(400).json({
                success: false,
                message: 'Nama skill dan level skill wajib diisi'
            });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO skills (user_id, skill_name, skill_level) VALUES (?, ?, ?)',
            [userId, skill_name, skill_level]
        );
        
        console.log(`✅ Skill added successfully with ID: ${result.insertId}`);
        
        res.json({
            success: true,
            message: 'Skill berhasil ditambahkan',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('❌ Error adding skill:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan skill',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/profile/skill/:id - Update skill
router.put('/skill/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const skillId = req.params.id;
        const { skill_name, skill_level } = req.body;
        
        console.log(`📝 Updating skill ID: ${skillId} for user ID: ${userId}`);
        
        if (!skill_name || !skill_level) {
            return res.status(400).json({
                success: false,
                message: 'Nama skill dan level skill wajib diisi'
            });
        }
        
        const [result] = await pool.execute(
            'UPDATE skills SET skill_name = ?, skill_level = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
            [skill_name, skill_level, skillId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Skill tidak ditemukan'
            });
        }
        
        console.log(`✅ Skill updated successfully`);
        
        res.json({
            success: true,
            message: 'Skill berhasil diperbarui'
        });
        
    } catch (error) {
        console.error('❌ Error updating skill:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui skill',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// DELETE /api/profile/skill/:id - Delete skill
router.delete('/skill/:id', authenticateToken, requireRole('pelamar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const skillId = req.params.id;
        
        console.log(`🗑️ Deleting skill ID: ${skillId} for user ID: ${userId}`);
        
        const [result] = await pool.execute(
            'DELETE FROM skills WHERE id = ? AND user_id = ?',
            [skillId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Skill tidak ditemukan'
            });
        }
        
        console.log(`✅ Skill deleted successfully`);
        
        res.json({
            success: true,
            message: 'Skill berhasil dihapus'
        });
        
    } catch (error) {
        console.error('❌ Error deleting skill:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus skill',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;