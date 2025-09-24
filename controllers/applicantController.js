const db = require("../config/database");

// GET all job applicants
exports.getAllJobApplicants = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM applications");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET job applicant by ID
exports.getJobApplicantById = async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db.query("SELECT * FROM applications WHERE id = ?", [id]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Applicant not found" });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST new job applicant
// POST new job applicant
exports.createJobApplicant = async (req, res) => {
  const { job_id, user_id, cover_letter, resume_file, status, notes } = req.body;

  // Validasi (tetap pakai user_id dari frontend)
  if (!job_id || !user_id || !resume_file) {
    return res.status(400).json({ message: "Job ID, User ID, and Resume file are required" });
  }

  try {
    const [result] = await db.query("INSERT INTO applications (job_id, pelamar_id, cover_letter, resume_file, status, notes) VALUES (?, ?, ?, ?, ?, ?)", [job_id, user_id, cover_letter, resume_file, status || "pending", notes || ""]);

    res.status(201).json({
      id: result.insertId,
      job_id,
      pelamar_id: user_id, // disimpan ke kolom pelamar_id
      cover_letter,
      resume_file,
      status: status || "pending",
      notes: notes || "",
      applied_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE job applicant status or notes
exports.updateJobApplicantStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes, reviewed_by } = req.body;

  if (!["pending", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const [result] = await db.query("UPDATE applications SET status = ?, notes = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?", [status, notes, reviewed_by, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    res.json({ message: `Applicant status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE job applicant
exports.deleteJobApplicant = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM applications WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Applicant not found" });
    }

    res.json({ message: "Applicant deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
