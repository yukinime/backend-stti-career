// controllers/applicantController.js
const db = require("../config/database");
const { buildUploadUrl } = require('../utils/url');

// 🔹 Pelamar melihat tracking lamaran miliknya
exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 50));
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        a.id,
        a.job_id,
        a.pelamar_id,
        a.status,
        a.cover_letter,
        a.notes,
        a.applied_at,
        a.resume_file,
        a.cover_letter_file AS application_cover_letter_file,
        a.portfolio_file AS application_portfolio_file,
        j.title       AS job_title,
        j.location,
        j.salary_range,
        c.nama_companies AS company_name,
        p.full_name,
        p.cv_file
      FROM applications a
      JOIN job_posts j       ON a.job_id = j.id
      LEFT JOIN companies c  ON j.company_id = c.id
      LEFT JOIN pelamar_profiles p ON p.user_id = a.pelamar_id
      WHERE a.pelamar_id = ?
      ORDER BY a.applied_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(sql, [userId, limit, offset]);

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM applications WHERE pelamar_id = ?`,
      [userId]
    );

    // Build URLs untuk file
    const dataWithUrls = rows.map(row => ({
      ...row,
      cv_file_url: row.cv_file 
        ? buildUploadUrl(req, 'files', row.cv_file) 
        : null,
      application_resume_url: row.resume_file 
        ? buildUploadUrl(req, 'files', row.resume_file) 
        : null,
      application_cover_letter_url: row.application_cover_letter_file 
        ? buildUploadUrl(req, 'files', row.application_cover_letter_file) 
        : null,
      application_portfolio_url: row.application_portfolio_file 
        ? buildUploadUrl(req, 'files', row.application_portfolio_file) 
        : null
    }));

    res.json({
      success: true,
      page,
      limit,
      total: countRows[0]?.total || 0,
      data: dataWithUrls
    });
  } catch (err) {
    console.error('Get my applications error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🔹 HR/Admin: Get all applicants dengan filter
exports.getAllJobApplicants = async (req, res) => {
  try {
    const { hrId, pelamarId, jobId, status } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let sql = `
      SELECT 
        a.id AS application_id,
        a.job_id,
        a.pelamar_id,
        a.status,
        a.cover_letter,
        a.notes,
        a.applied_at,
        a.resume_file,
        a.cover_letter_file AS application_cover_letter_file,
        a.portfolio_file AS application_portfolio_file,
        a.reviewed_at,
        a.reviewed_by,
        j.title AS job_title,
        j.location AS job_location,
        j.salary_range,
        j.salary_min,
        j.salary_max,
        j.work_type,
        j.work_time,
        j.hr_id,
        c.id AS company_id,
        c.nama_companies AS company_name,
        c.email_companies AS company_email,
        c.website AS company_website,
        c.logo AS company_logo,
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
        p.entry_year,
        p.cv_file,
        p.cover_letter_file AS profile_cover_letter_file,
        p.portfolio_file AS profile_portfolio_file
      FROM applications a
      JOIN pelamar_profiles p ON a.pelamar_id = p.user_id
      JOIN job_posts j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE 1=1
    `;
    const values = [];

    // PENTING: Jika HR, hanya tampilkan pelamar untuk job posts miliknya
    if (userRole === 'hr') {
      sql += " AND j.hr_id = ?";
      values.push(userId);
    }

    // Filter tambahan (untuk admin)
    if (hrId && userRole === 'admin') {
      sql += " AND j.hr_id = ?";
      values.push(hrId);
    }
    if (pelamarId) {
      sql += " AND a.pelamar_id = ?";
      values.push(pelamarId);
    }
    if (jobId) {
      sql += " AND a.job_id = ?";
      values.push(jobId);
    }
    if (status) {
      sql += " AND a.status = ?";
      values.push(status);
    }

    sql += " ORDER BY a.applied_at DESC";

    console.log('SQL Query:', sql);
    console.log('Values:', values);

    const [results] = await db.query(sql, values);

    console.log(`Found ${results.length} applicants for user ${userId} (${userRole})`);

    // Build URLs untuk file
    const dataWithUrls = results.map(row => ({
      ...row,
      // Company logo
      company_logo_url: row.company_logo 
        ? buildUploadUrl(req, 'company-logos', row.company_logo) 
        : null,
      
      // Profile photo pelamar
      profile_photo_url: row.profile_photo 
        ? buildUploadUrl(req, 'images', row.profile_photo) 
        : null,
      
      // File dari profil pelamar
      cv_file_url: row.cv_file 
        ? buildUploadUrl(req, 'files', row.cv_file) 
        : null,
      profile_cover_letter_url: row.profile_cover_letter_file 
        ? buildUploadUrl(req, 'files', row.profile_cover_letter_file) 
        : null,
      profile_portfolio_url: row.profile_portfolio_file 
        ? buildUploadUrl(req, 'files', row.profile_portfolio_file) 
        : null,
      
      // File dari application
      application_resume_url: row.resume_file 
        ? buildUploadUrl(req, 'files', row.resume_file) 
        : null,
      application_cover_letter_url: row.application_cover_letter_file 
        ? buildUploadUrl(req, 'files', row.application_cover_letter_file) 
        : null,
      application_portfolio_url: row.application_portfolio_file 
        ? buildUploadUrl(req, 'files', row.application_portfolio_file) 
        : null
    }));

    res.json({ 
      success: true, 
      total: dataWithUrls.length,
      user_role: userRole,
      user_id: userId,
      data: dataWithUrls 
    });
  } catch (err) {
    console.error('Get applicants error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// 🔹 HR/Admin: Get detail lengkap pelamar termasuk work experience, certificates, skills
exports.getJobApplicantById = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    // Get application data dengan profil pelamar
    let sql = `
      SELECT 
        a.*,
        j.title AS job_title,
        j.location AS job_location,
        j.salary_range,
        j.salary_min,
        j.salary_max,
        j.work_type,
        j.work_time,
        j.hr_id,
        c.id AS company_id,
        c.nama_companies AS company_name,
        c.email_companies AS company_email,
        c.website AS company_website,
        c.logo AS company_logo,
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
        p.entry_year,
        p.cv_file,
        p.cover_letter_file,
        p.portfolio_file,
        p.user_id
      FROM applications a
      JOIN pelamar_profiles p ON a.pelamar_id = p.user_id
      JOIN job_posts j ON a.job_id = j.id
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE a.id = ?
    `;
    
    const values = [id];

    // PENTING: HR hanya bisa akses applicant untuk job posts miliknya
    if (userRole === 'hr') {
      sql += " AND j.hr_id = ?";
      values.push(userId);
    }

    const [applications] = await db.query(sql, values);

    if (applications.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Applicant not found or you don't have access" 
      });
    }

    const applicant = applications[0];
    const pelamarUserId = applicant.user_id;

    // Get work experiences
    const [workExperiences] = await db.query(`
      SELECT * FROM work_experiences 
      WHERE user_id = ? 
      ORDER BY start_date DESC
    `, [pelamarUserId]);

    // Get certificates
    const [certificates] = await db.query(`
      SELECT * FROM certificates 
      WHERE user_id = ? 
      ORDER BY issue_date DESC
    `, [pelamarUserId]);

    // Get skills
    const [skills] = await db.query(`
      SELECT * FROM skills 
      WHERE user_id = ? 
      ORDER BY skill_name ASC
    `, [pelamarUserId]);

    // Build URLs
    const response = {
      ...applicant,
      // Company logo
      company_logo_url: applicant.logo 
        ? buildUploadUrl(req, 'company-logos', applicant.logo) 
        : null,
      
      // Profile photo
      profile_photo_url: applicant.profile_photo 
        ? buildUploadUrl(req, 'images', applicant.profile_photo) 
        : null,
      
      // Files dari profile
      cv_file_url: applicant.cv_file 
        ? buildUploadUrl(req, 'files', applicant.cv_file) 
        : null,
      cover_letter_file_url: applicant.cover_letter_file 
        ? buildUploadUrl(req, 'files', applicant.cover_letter_file) 
        : null,
      portfolio_file_url: applicant.portfolio_file 
        ? buildUploadUrl(req, 'files', applicant.portfolio_file) 
        : null,
      
      // Files dari application
      application_resume_url: applicant.resume_file 
        ? buildUploadUrl(req, 'files', applicant.resume_file) 
        : null,
      application_cover_letter_url: applicant.cover_letter_file 
        ? buildUploadUrl(req, 'files', applicant.cover_letter_file) 
        : null,
      application_portfolio_url: applicant.portfolio_file 
        ? buildUploadUrl(req, 'files', applicant.portfolio_file) 
        : null,
      
      // Work experiences
      work_experiences: workExperiences,
      
      // Certificates dengan URL
      certificates: certificates.map(cert => ({
        ...cert,
        certificate_file_url: cert.certificate_file 
          ? buildUploadUrl(req, 'files', cert.certificate_file) 
          : null
      })),
      
      // Skills
      skills: skills
    };

    res.json({ 
      success: true, 
      data: response 
    });
  } catch (err) {
    console.error('Get applicant by ID error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// POST new job applicant
exports.createJobApplicant = async (req, res) => {
  const { job_id, user_id, cover_letter, status, notes } = req.body;
  if (!job_id || !user_id) {
    return res.status(400).json({ 
      success: false,
      message: "Job ID dan User ID diperlukan" 
    });
  }
  
  try {
    // Validasi: cek apakah sudah pernah apply
    const [existing] = await db.query(
      "SELECT id FROM applications WHERE job_id = ? AND pelamar_id = ?",
      [job_id, user_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah melamar pekerjaan ini"
      });
    }

    const [result] = await db.query(
      "INSERT INTO applications (job_id, pelamar_id, cover_letter, status, notes) VALUES (?, ?, ?, ?, ?)",
      [job_id, user_id, cover_letter || "", status || "pending", notes || ""]
    );

    res.status(201).json({
      success: true,
      message: "Lamaran berhasil dikirim",
      data: {
        id: result.insertId,
        job_id,
        pelamar_id: user_id,
        cover_letter: cover_letter || "",
        status: status || "pending",
        notes: notes || "",
        applied_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Create applicant error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE job applicant status or notes
exports.updateJobApplicantStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const userRole = req.user.role;
  const userId = req.user.id;

  if (!status || !["pending", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ 
      success: false,
      message: "Status tidak valid. Gunakan: pending, accepted, atau rejected" 
    });
  }

  try {
    // Cek apakah HR punya akses ke application ini
    if (userRole === 'hr') {
      const [check] = await db.query(`
        SELECT a.id 
        FROM applications a
        JOIN job_posts j ON a.job_id = j.id
        WHERE a.id = ? AND j.hr_id = ?
      `, [id, userId]);

      if (check.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki akses untuk mengubah status lamaran ini"
        });
      }
    }

    const [result] = await db.query(
      "UPDATE applications SET status = ?, notes = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?", 
      [status, notes || null, userId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Applicant not found" 
      });
    }

    res.json({ 
      success: true,
      message: `Status lamaran berhasil diubah menjadi ${status}` 
    });
  } catch (err) {
    console.error('Update applicant status error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// DELETE job applicant
exports.deleteJobApplicant = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    // Cek apakah HR punya akses ke application ini
    if (userRole === 'hr') {
      const [check] = await db.query(`
        SELECT a.id 
        FROM applications a
        JOIN job_posts j ON a.job_id = j.id
        WHERE a.id = ? AND j.hr_id = ?
      `, [id, userId]);

      if (check.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak memiliki akses untuk menghapus lamaran ini"
        });
      }
    }

    const [result] = await db.query("DELETE FROM applications WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Applicant not found" 
      });
    }

    res.json({ 
      success: true,
      message: "Lamaran berhasil dihapus" 
    });
  } catch (err) {
    console.error('Delete applicant error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};