// controllers/jobController.js
const { db } = require("../config/database");

//UPDATE BARU
// === Helper normalisasi & daftar nilai yang diizinkan ===
const ALLOWED_WORK_TYPES = new Set(["on_site", "remote", "hybrid", "field"]); // field = Field Work/Mobile
const ALLOWED_WORK_TIMES = new Set(["full_time", "part_time", "freelance", "internship", "contract", "volunteer", "seasonal"]);

const _norm = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

// Terima variasi input dari FE (WFO/On-site/Remote/WFH/Hybrid/Field/Mobile)
const normalizeWorkType = (val) => {
  const x = _norm(val);
  if (["on_site", "onsite", "on-site", "wfo", "office"].includes(x)) return "on_site";
  if (["remote", "wfh"].includes(x)) return "remote";
  if (["hybrid"].includes(x)) return "hybrid";
  if (["field", "field_work", "fieldwork", "mobile", "lapangan"].includes(x)) return "field";
  return null;
};

// Terima variasi Full-time/Part-time/Freelance/Internship/Contract/Volunteer/Seasonal
const normalizeWorkTime = (val) => {
  const x = _norm(val);
  if (["full_time", "fulltime", "full-time"].includes(x)) return "full_time";
  if (["part_time", "parttime", "part-time"].includes(x)) return "part_time";
  if (["freelance", "contractor"].includes(x)) return "freelance";
  if (["internship", "magang"].includes(x)) return "internship";
  if (["contract", "kontrak"].includes(x)) return "contract";
  if (["volunteer", "relawan"].includes(x)) return "volunteer";
  if (["seasonal"].includes(x)) return "seasonal";
  return null;
};

// Pesan bantuan untuk FE kalau ngirim nilai salah
const WORK_TYPE_HINT = "work_type harus salah satu dari: on_site(WFO), remote(WFH), hybrid, field(mobile)";
const WORK_TIME_HINT = "work_time harus salah satu dari: full_time, part_time, freelance, internship, contract, volunteer, seasonal";
//SELESAI UPDATE

/* =========================
   Helpers: mapping payload
   ========================= */
const mapJobPayloadToDb = (p = {}) => {
  const out = {};

  // FE boleh kirim job_title/title -> simpan ke kolom DB: title
  if (p.job_title !== undefined || p.title !== undefined) {
    out.title = p.job_title ?? p.title;
  }
  // FE boleh kirim job_description/description -> simpan ke kolom DB: description
  if (p.job_description !== undefined || p.description !== undefined) {
    out.description = p.job_description ?? p.description;
  }

  if (p.is_active !== undefined) out.is_active = p.is_active ? 1 : 0;

  if (p.company_id !== undefined) out.company_id = p.company_id;
  if (p.category_id !== undefined) out.category_id = p.category_id;
  if (p.location !== undefined) out.location = p.location;
  if (p.salary_min !== undefined) out.salary_min = p.salary_min;
  if (p.salary_max !== undefined) out.salary_max = p.salary_max;

  // FE kirim qualifications -> simpan ke kolom DB: requirements
  if (p.qualifications !== undefined || p.requirements !== undefined) {
    out.requirements = p.qualifications ?? p.requirements;
  }

  // biarkan work_type & work_time ditangani di create/update (wajib & normalisasi)
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
  //  salary_range: salary_range, // TAMBAHKAN INI
  // ⬇️ tambahkan 2 field baru agar FE dapat nilainya
  work_type: r.work_type ?? null,
  work_time: r.work_time ?? null,
  // TAMBAHKAN di return object
  qualifications: r.requirements ?? null, // Map requirements DB -> qualifications API

  total_applicants: r.total_applicants ?? 0,
});
exports.getAllJobs = async (req, res) => {
  try {
    const { hrId } = req.query;

    let sql = `
      SELECT 
        jp.*, 
        COUNT(a.id) AS total_applicants
      FROM job_posts jp
      LEFT JOIN applications a ON a.job_id = jp.id
      WHERE 1=1
    `;
    const values = [];

    if (hrId) {
      // Dashboard HR → tampilkan semua job yang dibuat HR itu
      sql += " AND jp.hr_id = ?";
      values.push(hrId);
    } else {
      // Untuk pelamar → hanya tampilkan lowongan aktif dan sudah diverifikasi
      sql += " AND jp.is_active = 1 AND jp.verification_status = 'verified'";
    }

    sql += " GROUP BY jp.id ORDER BY jp.created_at DESC";

    const [rows] = await db.query(sql, values);

    res.json({
      success: true,
      data: rows.map(mapDbRowToApi),
    });
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

exports.createJob = async (req, res) => {
  try {
    console.log("📥 Request body:", req.body); // PINDAHKAN KE SINI
    const payload = mapJobPayloadToDb(req.body);
    console.log("🗃️ Mapped payload:", payload); // TAMBAHKAN DI SINI
    // Ambil judul dari payload atau body; simpan ke kolom DB: title
    const jobTitle = payload.title ?? req.body.job_title ?? req.body.title;
    if (!jobTitle) {
      return res.status(400).json({
        success: false,
        message: "Field job_title (atau title) wajib diisi",
      });
    }
    payload.title = jobTitle;

    // --- WAJIB: work_type & work_time ---
    const rawWorkType = req.body.work_type ?? req.body.workType;
    const rawWorkTime = req.body.work_time ?? req.body.workTime;

    const work_type = normalizeWorkType(rawWorkType);
    const work_time = normalizeWorkTime(rawWorkTime);

    if (!work_type) {
      return res.status(400).json({ success: false, message: WORK_TYPE_HINT });
    }
    if (!work_time) {
      return res.status(400).json({ success: false, message: WORK_TIME_HINT });
    }

    payload.work_type = work_type;
    payload.work_time = work_time;

    // TAMBAHKAN setelah set payload.work_time
    // Buat salary_range dari salary_min & salary_max
    if (req.body.salary_min || req.body.salary_max) {
      let salary_range = "";
      if (req.body.salary_min && req.body.salary_max) {
        salary_range = `${req.body.salary_min} - ${req.body.salary_max}`;
      } else if (req.body.salary_min) {
        salary_range = `Min: ${req.body.salary_min}`;
      } else if (req.body.salary_max) {
        salary_range = `Max: ${req.body.salary_max}`;
      }
      payload.salary_range = salary_range;
    }

    // ✅ Tambahkan hr_id
    const hrId = req.user?.id || req.body.hr_id; // tergantung kamu ambil dari login / body
    if (!hrId) {
      return res.status(400).json({
        success: false,
        message: "HR ID wajib diisi",
      });
    }
    payload.hr_id = hrId;
    console.log("💾 Final payload before insert:", payload); // SEBELUM INSERT
    const [result] = await db.query("INSERT INTO job_posts SET ?", [payload]);

    return res.status(201).json({
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

    const [cols] = await db.query(
      `SELECT COLUMN_NAME AS c
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_posts'`
    );
    const existingCols = new Set(cols.map((r) => r.c));

    // gunakan nama kolom DB yang sebenarnya
    const allowList = ["title", "description", "is_active", "verification_status", "company_id", "category_id", "location", "salary_min", "salary_max", "work_type", "work_time", "requirements", "salary_range"];

    // Terima alias dari FE dan normalisasi
    const raw = mapJobPayloadToDb(req.body);

    console.log("Mapped payload from FE to DB fields:", raw);

    // Normalisasi salary_range bila dikirim melalui salary_min atau salary_max
    if (raw.salary_min !== undefined || raw.salary_max !== undefined) {
      let salary_range = "";

      if (raw.salary_min && raw.salary_max) {
        salary_range = `${raw.salary_min} - ${raw.salary_max}`;
      } else if (raw.salary_min) {
        salary_range = `Min: ${raw.salary_min}`;
      } else if (raw.salary_max) {
        salary_range = `Max: ${raw.salary_max}`;
      }

      raw.salary_range = salary_range;
    }

    // Intersect: hanya field yang (diizinkan) & (ada di DB)
    const payload = {};
    for (const [k, v] of Object.entries(raw)) {
      if (allowList.includes(k) && existingCols.has(k)) {
        payload[k] = v;
      }
    }

    // Pindahkan log di sini
    console.log("ID:", id);
    console.log("Payload to update:", payload);

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
      return res.status(400).json({ success: false, message: "Invalid status" });
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
      [adminId, status === "verified" ? "verify_job" : "reject_job", id, reason || null]
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
