// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Register Pelamar
const registerPelamar = async (req, res) => {
    try {
        const { full_name, email, password, address, date_of_birth, phone } = req.body;

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new pelamar
        const [result] = await pool.execute(
            `INSERT INTO users (full_name, email, password, role, address, date_of_birth, phone) 
             VALUES (?, ?, ?, 'pelamar', ?, ?, ?)`,
            [full_name, email, hashedPassword, address, date_of_birth, phone]
        );

        // Get created user
        const [users] = await pool.execute(
            'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        const user = users[0];
        const token = generateToken(user);

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
                token
            }
        });

    } catch (error) {
        console.error('Register pelamar error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Register HR
const registerHR = async (req, res) => {
    try {
        const { full_name, email, password, company_name, company_address, position, phone } = req.body;

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email sudah terdaftar'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new HR
        const [result] = await pool.execute(
            `INSERT INTO users (full_name, email, password, role, company_name, company_address, position, phone) 
             VALUES (?, ?, ?, 'hr', ?, ?, ?, ?)`,
            [full_name, email, hashedPassword, company_name, company_address, position, phone]
        );

        // Get created user
        const [users] = await pool.execute(
            'SELECT id, full_name, email, role, company_name, position, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        const user = users[0];
        const token = generateToken(user);

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
                token
            }
        });

    } catch (error) {
        console.error('Register HR error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const [users] = await pool.execute(
            `SELECT id, full_name, email, password, role, company_name, position, 
                    address, date_of_birth, phone, is_active 
             FROM users WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        const user = users[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Akun Anda telah dinonaktifkan'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Remove password from response
        delete user.password;

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                user,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, full_name, email, role, company_name, company_address, position, 
                    address, date_of_birth, phone, created_at, updated_at 
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    registerPelamar,
    registerHR,
    login,
    getProfile
};