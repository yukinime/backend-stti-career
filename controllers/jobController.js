// controllers/jobController.js
const db = require('../config/database');

// GET all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM job_post');
    res.json(results);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET job summary (job_title, status, created_at)
exports.getJobSummary = async (req, res) => {
  try {
    // Query untuk mengambil job_title, status, created_at
    const [results] = await db.query('SELECT job_title, status, created_at FROM job_post');

    // Debugging: Periksa hasil query
    console.log('Results:', results); // Ini akan membantu kita melihat apa yang diterima dari query

    if (results.length === 0) {
      console.log('No jobs found in the database');
      return res.status(404).json({ message: 'No jobs found' });
    }

    // Mengirimkan hasil query sebagai respons
    res.json(results);
  } catch (err) {
    console.error('Database query error:', err);  // Menampilkan error jika ada
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET job by ID
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await db.query('SELECT * FROM job_post WHERE id = ?', [id]);
    if (results.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST job
exports.createJob = async (req, res) => {
  try {
    const jobData = req.body;
    const [result] = await db.query('INSERT INTO job_post SET ?', [jobData]);
    res.status(201).json({ id: result.insertId, ...jobData });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE job
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    await db.query('UPDATE job_post SET ? WHERE id = ?', [updatedData, id]);
    res.json({ message: 'Job updated', id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM job_post WHERE id = ?', [id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// VERIFY job
exports.verifyJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.query('UPDATE job_post SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Job ${status}`, id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
// GET job details (including total applicants, selection stages, etc.)
exports.getJobDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Query untuk mendapatkan data lowongan kerja dan total pelamar
    const [jobResults] = await db.query(`
      SELECT jp.id, jp.job_title, jp.status, COUNT(a.id) AS total_applications
      FROM job_post jp
      LEFT JOIN applications a ON a.job_id = jp.id
      WHERE jp.id = ?
      GROUP BY jp.id
    `, [id]);

    if (jobResults.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = jobResults[0];

    // Jika ada tahapan seleksi, ambil data tahapan seleksi dari tabel lainnya
    // Misalnya jika ada tabel `selection_phases` (belum ada di deskripsi, jadi anggap jika perlu ditambahkan)
    const [selectionStages] = await db.query(`
      SELECT sp.phase_name, sp.status
      FROM selection_phases sp
      WHERE sp.job_id = ?
    `, [id]);

    // Data lengkap untuk job termasuk total pelamar dan tahapan seleksi
    const jobDetails = {
      id: job.id,
      job_title: job.job_title,
      status: job.status,
      total_applicants: job.total_applicants,
      selection_stages: selectionStages // jika ada tahapan seleksi
    };

    res.json(jobDetails);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};