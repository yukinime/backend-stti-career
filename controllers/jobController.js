// controllers/jobController.js
const { db } = require("../config/database");

/* =========================
   Helpers: mapping payload
   ========================= */
const mapJobPayloadToDb = (p = {}) => {
  const out = {};

  // Terima kedua nama: job_title / title
  if (p.job_title !== undefined || p.title !== undefined) {
    out.title = p.job_title ?? p.title;
  }
  // Terima kedua nama: job_description / description
  if (p.job_description !== undefined || p.description !== undefined) {
    out.description = p.job_description ?? p.description;
  }

  // Flag aktif (normalkan ke 0/1)
  if (p.is_active !== undefined) out.is_active = p.is_active ? 1 : 0;

  // Field opsional lain jika ada di schema DB kamu
  if (p.company_id !== undefined) out.company_id = p.company_id;
  if (p.category_id !== undefined) out.category_id = p.category_id;
  if (p.location !== undefined) out.location = p.location;
  if (p.salary_min !== undefined) out.salary_min = p.salary_min;
  if (p.salary_max !== undefined) out.salary_max = p.salary_max;

  return out;
};

const mapDbRowToApi = (r = {}) => ({
  id: r.id,
  job_title: r.title ?? null,
  job_description: r.description ?? null,
  is_active: r.is_active ?? 0,
  verification_status: r.verification_status ?? "pending",
  created_at: r.created_at,
  updated_at: r.updated_at,
  company_id: r.company_id ?? null,
  category_id: r.category_id ?? null,
  location: r.location ?? null,
  salary_min: r.salary_min ?? null,
  salary_max: r.salary_max ?? null,
});

/* =========================
   GET: semua job
   ========================= */
exports.getAllJobs = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM job_posts ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows.map(mapDbRowToApi) });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   GET: ringkasan job
   ========================= */
exports.getJobSummary = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, title, is_active, verification_status, created_at
      FROM job_posts
      ORDER BY created_at DESC
    `);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "No jobs found" });
    }

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        job_title: r.title,
        is_active: r.is_active,
        verification_status: r.verification_status,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   GET: job by ID
   ========================= */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM job_posts WHERE id = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json({ success: true, data: mapDbRowToApi(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   POST: create job
   ========================= */
exports.createJob = async (req, res) => {
  try {
    const payload = mapJobPayloadToDb(req.body);

    if (!payload.title) {
      return res.status(400).json({
        success: false,
        message: "Field job_title (atau title) wajib diisi",
      });
    }

    const [result] = await db.query("INSERT INTO job_posts SET ?", [payload]);

    // kembalikan bentuk FE-friendly
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        ...mapDbRowToApi({ id: result.insertId, ...payload }),
      },
    });
  } catch (err) {
    console.error("Create job error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   PUT: update job
   ========================= */
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil daftar kolom yang benar2 ada di DB
    const [cols] = await db.query(
      `SELECT COLUMN_NAME AS c
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_posts'`
    );
    const existingCols = new Set(cols.map((r) => r.c));

    // Daftar field yang memang kita izinkan untuk diupdate
    const allowList = [
      "job_title",
      "job_description",
      "is_active",
      "verification_status",
      "company_id",
      "category_id",
      "location",
      "salary_min",
      "salary_max",
    ];

    // Intersect: hanya field yang (diizinkan) dan (ada di DB)
    const payload = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (allowList.includes(k) && existingCols.has(k)) {
        payload[k] = v;
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada field yang valid untuk diupdate",
      });
    }

    await db.query("UPDATE job_posts SET ? WHERE id = ?", [payload, id]);
    return res.json({ success: true, message: "Job updated", id });
  } catch (err) {
    console.error("Update job error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   DELETE: hapus job
   ========================= */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM job_posts WHERE id = ?", [id]);
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   PUT: verifikasi job
   ========================= */
exports.verifyJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id || null;

    if (!["verified", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    await db.query(
      `UPDATE job_posts
       SET verification_status=?, verification_by=?, verification_at=NOW(), rejection_reason=?
       WHERE id=?`,
      [status, adminId, status === "rejected" ? reason : null, id]
    );

    await db.query(
      `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, note)
       VALUES (?, ?, 'job_post', ?, ?)`,
      [
        adminId,
        status === "verified" ? "verify_job" : "reject_job",
        id,
        reason || null,
      ]
    );

    res.json({ success: true, message: `Job ${status} successfully`, id });
  } catch (err) {
    console.error("Verify job error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================
   GET: detail job (+ total pelamar & tahapan)
   ========================= */
exports.getJobDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [jobRows] = await db.query(
      `SELECT jp.id, jp.title, jp.description, jp.verification_status, jp.is_active,
              COUNT(a.id) AS total_applications
       FROM job_posts jp
       LEFT JOIN applications a ON a.job_id = jp.id
       WHERE jp.id = ?
       GROUP BY jp.id`,
      [id]
    );

    if (!jobRows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const job = jobRows[0];

    const [selectionStages] = await db.query(
      `SELECT sp.phase_name, sp.status
       FROM selection_phases sp
       WHERE sp.job_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: job.id,
        job_title: job.title,
        job_description: job.description,
        verification_status: job.verification_status,
        is_active: job.is_active,
        total_applications: job.total_applications,
        selection_stages: selectionStages,
      },
    });
  } catch (err) {
    console.error("Get job details error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
