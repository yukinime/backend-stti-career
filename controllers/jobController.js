// controllers/jobController.js
const db = require('../config/database');

/**
 * GET all jobs
 */
exports.getAllJobs = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM job_posts ORDER BY created_at DESC');
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET job summary (title, status, created_at, verification_status)
 */
exports.getJobSummary = async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT id, job_title, is_active, verification_status, created_at FROM job_posts ORDER BY created_at DESC'
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No jobs found' });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET job by ID
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await db.query('SELECT * FROM job_posts WHERE id = ?', [id]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, data: results[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * CREATE job
 */
exports.createJob = async (req, res) => {
  try {
    const jobData = req.body;
    const [result] = await db.query('INSERT INTO job_posts SET ?', [jobData]);
    res.status(201).json({ success: true, data: { id: result.insertId, ...jobData } });
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * UPDATE job
 */
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    await db.query('UPDATE job_posts SET ? WHERE id = ?', [updatedData, id]);
    res.json({ success: true, message: 'Job updated', id });
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE job
 */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM job_posts WHERE id = ?', [id]);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * VERIFY job (approve / reject)
 */
exports.verifyJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id || null; // asumsi middleware auth inject req.user

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await db.query(
      `UPDATE job_posts 
       SET verification_status=?, verification_by=?, verification_at=NOW(), rejection_reason=? 
       WHERE id=?`,
      [status, adminId, status === 'rejected' ? reason : null, id]
    );

    // log ke admin_activity_logs
    await db.query(
      `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, note) 
       VALUES (?, ?, 'job_post', ?, ?)`,
      [adminId, status === 'verified' ? 'verify_job' : 'reject_job', id, reason || null]
    );

    res.json({ success: true, message: `Job ${status} successfully`, id });
  } catch (err) {
    console.error('Verify job error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET job details (with total applications & selection phases)
 */
exports.getJobDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [jobResults] = await db.query(
      `SELECT jp.id, jp.job_title, jp.verification_status, jp.is_active, 
              COUNT(a.id) AS total_applications
       FROM job_posts jp
       LEFT JOIN applications a ON a.job_id = jp.id
       WHERE jp.id = ?
       GROUP BY jp.id`,
      [id]
    );

    if (jobResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = jobResults[0];

    const [selectionStages] = await db.query(
      `SELECT sp.phase_name, sp.status 
       FROM selection_phases sp 
       WHERE sp.job_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...job,
        selection_stages: selectionStages
      }
    });
  } catch (err) {
    console.error('Get job details error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
