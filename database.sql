

-- Table untuk menyimpan semua user (HR, Pelamar, Admin)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'hr', 'pelamar') NOT NULL DEFAULT 'pelamar',
    address TEXT,
    date_of_birth DATE,
    phone VARCHAR(20),
    company_name VARCHAR(255), -- untuk HR
    company_address TEXT, -- untuk HR
    position VARCHAR(255), -- untuk HR
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table untuk menyimpan lowongan pekerjaan (opsional)
CREATE TABLE job_posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hr_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    salary_range VARCHAR(100),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table untuk menyimpan aplikasi lamaran (opsional)
CREATE TABLE applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT,
    pelamar_id INT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    cover_letter TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES job_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (pelamar_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO users (full_name, email, password, role) VALUES 
('Administrator', 'admin@stti.ac.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG9xLH0O.K', 'admin');
-- Password: 4dm1n (sudah di-hash dengan bcrypt)