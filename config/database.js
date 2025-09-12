// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stti_career',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    timezone: '+07:00' // WIB timezone
});

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        
        // Test basic query
        const [result] = await connection.execute('SELECT 1 as test');
        console.log('✅ Database query test passed');
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        
        // Detailed error information
        if (error.code === 'ECONNREFUSED') {
            console.error('   Pastikan MySQL server berjalan');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Username atau password database salah');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('   Database tidak ditemukan');
        }
        
        return false;
    }
};

// Create database connection (legacy method for compatibility)
const db = {
    execute: async (query, params = []) => {
        try {
            const [result] = await pool.execute(query, params);
            return [result];
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },
    query: async (query, params = []) => {
        try {
            const [result] = await pool.query(query, params);
            return [result];
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
};

// Initialize database and create tables if needed
const initializeDatabase = async () => {
    try {
        console.log('🔧 Initializing database...');
        
        // Create users table if not exists
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id int(11) NOT NULL AUTO_INCREMENT,
                full_name varchar(255) NOT NULL,
                email varchar(255) NOT NULL UNIQUE,
                password varchar(255) NOT NULL,
                role enum('admin','hr','pelamar') NOT NULL DEFAULT 'pelamar',
                company_name varchar(255) DEFAULT NULL,
                company_address text DEFAULT NULL,
                position varchar(255) DEFAULT NULL,
                address text DEFAULT NULL,
                date_of_birth date DEFAULT NULL,
                phone varchar(20) DEFAULT NULL,
                is_active tinyint(1) DEFAULT 1,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_email (email),
                KEY idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create pelamar_profiles table if not exists
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS pelamar_profiles (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) NOT NULL,
                full_name varchar(255) DEFAULT NULL,
                email varchar(255) DEFAULT NULL,
                phone varchar(20) DEFAULT NULL,
                address text DEFAULT NULL,
                city varchar(100) DEFAULT NULL,
                country varchar(100) DEFAULT 'Indonesia',
                date_of_birth date DEFAULT NULL,
                education_level enum('SMA','D3','S1','S2','S3') DEFAULT NULL,
                major varchar(255) DEFAULT NULL,
                institution_name varchar(255) DEFAULT NULL,
                gpa decimal(3,2) DEFAULT NULL,
                entry_year int(4) DEFAULT NULL,
                graduation_year int(4) DEFAULT NULL,
                profile_photo varchar(255) DEFAULT NULL,
                cv_file varchar(255) DEFAULT NULL,
                cover_letter_file varchar(255) DEFAULT NULL,
                portfolio_file varchar(255) DEFAULT NULL,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_user_id (user_id),
                CONSTRAINT fk_pelamar_profiles_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create work_experiences table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS work_experiences (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) NOT NULL,
                company_name varchar(255) NOT NULL,
                position varchar(255) NOT NULL,
                start_date date NOT NULL,
                end_date date DEFAULT NULL,
                is_current tinyint(1) DEFAULT 0,
                job_description text DEFAULT NULL,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_user_id (user_id),
                CONSTRAINT fk_work_experiences_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create certificates table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS certificates (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) NOT NULL,
                certificate_name varchar(255) NOT NULL,
                issuer varchar(255) NOT NULL,
                issue_date date NOT NULL,
                expiry_date date DEFAULT NULL,
                certificate_file varchar(255) DEFAULT NULL,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_user_id (user_id),
                CONSTRAINT fk_certificates_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create skills table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS skills (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) NOT NULL,
                skill_name varchar(255) NOT NULL,
                skill_level enum('Beginner','Intermediate','Advanced','Expert') DEFAULT 'Intermediate',
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_user_id (user_id),
                CONSTRAINT fk_skills_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create hr_profiles table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS hr_profiles (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) NOT NULL,
                company_name varchar(255) NOT NULL,
                company_address text DEFAULT NULL,
                position varchar(255) DEFAULT NULL,
                department varchar(255) DEFAULT NULL,
                employee_count varchar(50) DEFAULT NULL,
                company_description text DEFAULT NULL,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_user_id (user_id),
                CONSTRAINT fk_hr_profiles_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ Database tables initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
};

module.exports = {
    pool,
    db,
    testConnection,
    initializeDatabase,
    // Compatibility exports
    execute: db.execute,
    query: db.query
};