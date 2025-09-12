// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Generate JWT Token
const generateToken = (user) => {
    const accessToken = jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = jwt.sign(
        { 
            id: user.id 
        },
        process.env.JWT_SECRET + '_refresh',
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

// Store refresh tokens (in production, use Redis or database)
let refreshTokens = [];

// Register Pelamar
const registerPelamar = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { full_name, email, password, address, date_of_birth, phone } = req.body;

        console.log('👤 Registering new pelamar:', email);

        // Validasi input
        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nama lengkap, email, dan password wajib diisi'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password minimal 6 karakter'
            });
        }

        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new pelamar
        const [result] = await connection.execute(
            `INSERT INTO users (full_name, email, password, role, address, date_of_birth, phone) 
             VALUES (?, ?, ?, 'pelamar', ?, ?, ?)`,
            [full_name, email, hashedPassword, address, date_of_birth, phone]
        );

        // Juga buat record di pelamar_profiles
        await connection.execute(
            `INSERT INTO pelamar_profiles (user_id, full_name, email, phone, address, date_of_birth) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [result.insertId, full_name, email, phone, address, date_of_birth]
        );

        // Get created user
        const [users] = await connection.execute(
            'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        const user = users[0];
        const tokens = generateToken(user);

        // Simpan refresh token (dalam production, simpan di database)
        refreshTokens.push(tokens.refreshToken);

        await connection.commit();

        console.log(`✅ Pelamar registered successfully with ID: ${user.id}`);

        res.status(201).json({
            success: true,
            message: 'Registrasi pelamar berhasil',
            data: {
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at
                },
                tokens
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Register pelamar error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
};

// Register HR
const registerHR = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { full_name, email, password, company_name, company_address, position, phone } = req.body;

        console.log('🏢 Registering new HR:', email);

        // Validasi input
        if (!full_name || !email || !password || !company_name) {
            return res.status(400).json({
                success: false,
                message: 'Nama lengkap, email, password, dan nama perusahaan wajib diisi'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password minimal 6 karakter'
            });
        }

        // Check if user already exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new HR
        const [result] = await connection.execute(
            `INSERT INTO users (full_name, email, password, role, company_name, company_address, position, phone) 
             VALUES (?, ?, ?, 'hr', ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, company_name, company_address, position, phone]
        );

        // Juga buat record di hr_profiles
        await connection.execute(
            `INSERT INTO hr_profiles (user_id, company_name, company_address, position) 
             VALUES (?, ?, ?, ?)`,
            [result.insertId, company_name, company_address, position]
        );

        // Get created user
        const [users] = await connection.execute(
            'SELECT id, full_name, email, role, company_name, position, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        const user = users[0];
        const tokens = generateToken(user);

        // Simpan refresh token
        refreshTokens.push(tokens.refreshToken);

        await connection.commit();

        console.log(`✅ HR registered successfully with ID: ${user.id}`);

        res.status(201).json({
            success: true,
            message: 'Registrasi HR berhasil',
            data: {
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    company_name: user.company_name,
                    position: user.position,
                    created_at: user.created_at
                },
                tokens
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Register HR error:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        // Validasi input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email dan password wajib diisi'
            });
        }

        // Find user by email
        const [users] = await pool.execute(
            `SELECT id, full_name, email, password, role, company_name, position, 
                    address, date_of_birth, phone, is_active, created_at
             FROM users WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            console.log('❌ User inactive:', email);
            return res.status(403).json({
                success: false,
                message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        // Generate tokens
        const tokens = generateToken(user);

        // Simpan refresh token
        refreshTokens.push(tokens.refreshToken);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        console.log(`✅ Login successful for user ID: ${user.id} (${user.role})`);

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                user: userWithoutPassword,
                tokens
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Refresh Token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        console.log('🔄 Refreshing token...');

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token diperlukan'
            });
        }

        if (!refreshTokens.includes(refreshToken)) {
            return res.status(403).json({
                success: false,
                message: 'Refresh token tidak valid'
            });
        }

        jwt.verify(refreshToken, process.env.JWT_SECRET + '_refresh', async (err, decoded) => {
            if (err) {
                console.log('❌ Invalid refresh token');
                return res.status(403).json({
                    success: false,
                    message: 'Refresh token tidak valid atau telah kedaluwarsa'
                });
            }

            // Get user data
            const [users] = await pool.execute(
                'SELECT id, email, role, is_active FROM users WHERE id = ?',
                [decoded.id]
            );

            if (users.length === 0 || !users[0].is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'User tidak ditemukan atau tidak aktif'
                });
            }

            const user = users[0];
            const tokens = generateToken(user);

            // Hapus refresh token lama dan tambahkan yang baru
            refreshTokens = refreshTokens.filter(token => token !== refreshToken);
            refreshTokens.push(tokens.refreshToken);

            console.log(`✅ Token refreshed for user ID: ${user.id}`);

            res.json({
                success: true,
                message: 'Token berhasil diperbarui',
                data: { tokens }
            });
        });

    } catch (error) {
        console.error('❌ Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        console.log('🚪 Logging out user...');

        if (refreshToken) {
            // Hapus refresh token dari storage
            refreshTokens = refreshTokens.filter(token => token !== refreshToken);
        }

        console.log('✅ Logout successful');

        res.json({
            success: true,
            message: 'Logout berhasil'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📋 Getting profile for user ID: ${userId}`);

        const [users] = await pool.execute(
            `SELECT id, full_name, email, role, company_name, company_address, position, 
                    address, date_of_birth, phone, created_at, updated_at, is_active
             FROM users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        const user = users[0];

        // Untuk pelamar, ambil data tambahan dari pelamar_profiles
        if (user.role === 'pelamar') {
            const [profile] = await pool.execute(
                `SELECT education_level, major, institution_name, gpa, 
                        entry_year, graduation_year, profile_photo,
                        cv_file, cover_letter_file, portfolio_file
                 FROM pelamar_profiles WHERE user_id = ?`,
                [userId]
            );
            
            user.profile = profile[0] || {};
        }

        // Untuk HR, ambil data tambahan dari hr_profiles
        if (user.role === 'hr') {
            const [profile] = await pool.execute(
                `SELECT department, employee_count, company_description
                 FROM hr_profiles WHERE user_id = ?`,
                [userId]
            );
            
            user.profile = profile[0] || {};
        }

        console.log(`✅ Profile retrieved for user ID: ${userId}`);

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Change Password
const changePassword = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        console.log(`🔑 Changing password for user ID: ${userId}`);

        // Validasi input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password lama dan password baru wajib diisi'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal 6 karakter'
            });
        }

        // Get current password
        const [users] = await connection.execute(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password lama tidak sesuai'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await connection.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, userId]
        );

        await connection.commit();

        console.log(`✅ Password changed successfully for user ID: ${userId}`);

        res.json({
            success: true,
            message: 'Password berhasil diubah'
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    registerPelamar,
    registerHR,
    login,
    refreshToken,
    logout,
    getProfile,
    changePassword
};