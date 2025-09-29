// controllers/jobController.js
const { db } = require("../config/database");
const translationService = require("../services/translationService");

const SUPPORTED_LANGS = ["id", "en", "ja"];

// === Helper normalisasi & daftar nilai yang diizinkan ===
const ALLOWED_WORK_TYPES = new Set(["on_site", "remote", "hybrid", "field"]); // field = Field Work/Mobile
const ALLOWED_WORK_TIMES = new Set([
  "full_time",
  "part_time",
  "freelance",
  "internship",
  "contract",
  "volunteer",
  "seasonal",
]);

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
const WORK_TYPE_HINT =
  "work_type harus salah satu dari: on_site(WFO), remote(WFH), hybrid, field(mobile)";
const WORK_TIME_HINT =
  "work_time harus salah satu dari: full_time, part_time, freelance, internship, contract, volunteer, seasonal";

/* =========================
   Helpers: mapping payload
   ========================= */
const getAliasValue = (source = {}, aliases = []) => {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return undefined;
};

const mapJobPayloadToDb = (p = {}) => {
  const out = {};

  // FE boleh kirim job_title/title -> simpan ke kolom DB: title
  const titleVal = getAliasValue(p, ["title", "job_title"]);
  if (titleVal !== undefined) {
    out.title = titleVal;
  }
  // FE boleh kirim job_description/description -> simpan ke kolom DB: description
  const descriptionVal = getAliasValue(p, ["description", "job_description"]);
  if (descriptionVal !== undefined) {
    out.description = descriptionVal;
  }

 out.requirements = p.qualifications ?? getAliasValue(p, [
  "requirements",
  "requirement",
  "job_requirements",
  "jobRequirements",
  "jobRequirement",
]);

  const salaryRangeVal = getAliasValue(p, ["salary_range", "salaryRange"]);
  if (salaryRangeVal !== undefined) {
    out.salary_range = salaryRangeVal;
  }

  if (p.is_active !== undefined) out.is_active = p.is_active ? 1 : 0;

  if (p.company_id !== undefined) out.company_id = p.company_id;
  if (p.category_id !== undefined) out.category_id = p.category_id;
  if (p.location !== undefined) out.location = p.location;
  if (p.salary_min !== undefined) out.salary_min = p.salary_min;
  if (p.salary_max !== undefined) out.salary_max = p.salary_max;



 if (p.salary_range !== undefined) {
  out.salary_range = p.salary_range;
} else if (p.salary_min !== undefined || p.salary_max !== undefined) {
  if (p.salary_min !== undefined && p.salary_max !== undefined) {
    out.salary_range = `${p.salary_min} - ${p.salary_max}`;
  } else if (p.salary_min !== undefined) {
    out.salary_range = `Min: ${p.salary_min}`;
  } else if (p.salary_max !== undefined) {
    out.salary_range = `Max: ${p.salary_max}`;
  }
}

  // biarkan work_type & work_time ditangani di create/update (wajib & normalisasi)
  return out;
};

const mapDbRowToApi = (r = {}) => ({
  id: r.id,
  job_title: r.title ?? null,
  job_description: r.description ?? null,
  requirements: r.requirements ?? null,
  is_active: r.is_active ?? 0,
  verification_status: r.verification_status ?? "pending",
  created_at: r.created_at,
  updated_at: r.updated_at,
  company_id: r.company_id ?? null,
  category_id: r.category_id ?? null,
  location: r.location ?? null,
  salary_min: r.salary_min ?? null,
  salary_max: r.salary_max ?? null,
  salary_range: r.salary_range ?? null,
  work_type: r.work_type ?? null,
  work_time: r.work_time ?? null,
  qualifications: r.requirements ?? null, // Map requirements DB -> qualifications API
  total_applicants: r.total_applicants ?? 0,
});

const validateLangParam = (lang) => {
  if (!lang) return { lang: "id", isDefault: true };
  if (lang === "all") {
    return { lang: "all", isDefault: false };
  }
  if (!SUPPORTED_LANGS.includes(lang)) {
    const supported = SUPPORTED_LANGS.join(", ");
    const error = new Error(`Invalid lang parameter. Supported languages: ${supported}`);
    error.statusCode = 400;
    throw error;
  }
  return { lang, isDefault: lang === "id" };
};

/* =========================
   GET: semua job
   ========================= */
exports.getAllJobs = async (req, res) => {
  try {
    const { hrId, lang: queryLang } = req.query;

    let langInfo;
    try {
      langInfo = validateLangParam(queryLang); // id | en | ja | all
    } catch (validationErr) {
      const statusCode = validationErr.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: validationErr.message });
    }

    let sql = `
      SELECT jp.*, COUNT(a.id) AS total_applicants
      FROM job_posts jp
      LEFT JOIN applications a ON a.job_id = jp.id
      WHERE 1=1
    `;
    const values = [];

    if (hrId) {
      sql += " AND jp.hr_id = ?";
      values.push(hrId);
    } else {
      sql += " AND jp.is_active = 1 AND jp.verification_status = 'verified'";
    }

    sql += " GROUP BY jp.id ORDER BY jp.created_at DESC";

    const [rows] = await db.query(sql, values);
    const jobs = rows.map(mapDbRowToApi);

    // ---- translations (sekali saja) ----
    if (!langInfo.isDefault) {
      if (langInfo.lang === "all") {
        await Promise.all(
          jobs.map(async (job) => {
            job.translations = await translationService.getAllCachedTranslations(job.id);
          })
        );
      } else {
        await Promise.all(
          jobs.map(async (job) => {
            const t = await translationService.getJobTranslation(job.id, langInfo.lang);
            if (t) job.translations = { [langInfo.lang]: t };
          })
        );
      }
    }

    res.json({ success: true, data: jobs });
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
    const { lang: queryLang } = req.query;

    let langInfo;
    try {
      langInfo = validateLangParam(queryLang);
    } catch (validationErr) {
      const statusCode = validationErr.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: validationErr.message });
    }

    const [rows] = await db.query("SELECT * FROM job_posts WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const jobData = mapDbRowToApi(rows[0]);

    // ---- translations (sekali saja) ----
    if (!langInfo.isDefault) {
      if (langInfo.lang === "all") {
        jobData.translations = await translationService.getAllCachedTranslations(jobData.id);
      } else {
        const t = await translationService.getJobTranslation(jobData.id, langInfo.lang);
        if (t) jobData.translations = { [langInfo.lang]: t };
      }
    }

    res.json({ success: true, data: jobData });
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

    // ✅ Tambahkan hr_id
    const hrId = req.user?.id || req.body.hr_id; // tergantung kamu ambil dari login / body
    if (!hrId) {
      return res.status(400).json({
        success: false,
        message: "HR ID wajib diisi",
      });
    }
    payload.hr_id = hrId;

    const [result] = await db.query("INSERT INTO job_posts SET ?", [payload]);

    // Warm translations (optional)
    try {
      await translationService.refreshJobTranslations(
        result.insertId,
        SUPPORTED_LANGS.filter((lang) => lang !== "id"),
        payload
      );
    } catch (translationErr) {
      console.error("Job translation cache warm error:", translationErr);
    }

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
    const allowList = [
      "title",
      "description",
      "requirements",
      "is_active",
      "verification_status",
      "company_id",
      "category_id",
      "location",
      "salary_min",
      "salary_max",
      "salary_range",
      "work_type",
      "work_time",
    ];

    // Terima alias dari FE dan normalisasi
    const raw = { ...req.body };

    // job_title -> title
    if (raw.job_title !== undefined && raw.title === undefined) {
      raw.title = raw.job_title;
      delete raw.job_title;
    }
    // job_description -> description
    if (raw.job_description !== undefined && raw.description === undefined) {
      raw.description = raw.job_description;
      delete raw.job_description;
    }

      const reqVal = raw.qualifications ?? getAliasValue(raw, [
      "requirements",
      "requirement",
      "job_requirements",
      "jobRequirements",
      "jobRequirement",
    ]);
    if (reqVal !== undefined) {
      raw.requirements = reqVal;
      // hapus alias lama supaya tidak masuk ke payload
      delete raw.requirement;
      delete raw.job_requirements;
      delete raw.jobRequirements;
      delete raw.jobRequirement;
      delete raw.qualifications;
    }


    const salaryRangeVal = getAliasValue(raw, ["salary_range", "salaryRange"]);
    if (salaryRangeVal !== undefined) {
      raw.salary_range = salaryRangeVal;
      delete raw.salaryRange;
    }


    // Normalisasi work_type / work_time bila dikirim
    if (raw.work_type !== undefined || raw.workType !== undefined) {
      const wt = normalizeWorkType(raw.work_type ?? raw.workType);
      if (!wt) return res.status(400).json({ success: false, message: WORK_TYPE_HINT });
      raw.work_type = wt;
      delete raw.workType;
    }
    if (raw.work_time !== undefined || raw.workTime !== undefined) {
      const wtm = normalizeWorkTime(raw.work_time ?? raw.workTime);
      if (!wtm) return res.status(400).json({ success: false, message: WORK_TIME_HINT });
      raw.work_time = wtm;
      delete raw.workTime;
    }

    if (raw.salary_range === undefined && (raw.salary_min !== undefined || raw.salary_max !== undefined)) {
  if (raw.salary_min !== undefined && raw.salary_max !== undefined) {
    raw.salary_range = `${raw.salary_min} - ${raw.salary_max}`;
  } else if (raw.salary_min !== undefined) {
    raw.salary_range = `Min: ${raw.salary_min}`;
  } else if (raw.salary_max !== undefined) {
    raw.salary_range = `Max: ${raw.salary_max}`;
  }
}

    // Intersect: hanya field yang (diizinkan) & (ada di DB)
    const payload = {};
    for (const [k, v] of Object.entries(raw)) {
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

    // Refresh translations (optional)
    try {
      await translationService.refreshJobTranslations(
        id,
        SUPPORTED_LANGS.filter((lang) => lang !== "id"),
        payload
      );
    } catch (translationErr) {
      console.error("Job translation cache warm error:", translationErr);
    }

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
    await db.query("DELETE FROM job_post_translations WHERE job_id = ?", [id]);
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
    const { lang: queryLang } = req.query;

    let langInfo;
    try {
      langInfo = validateLangParam(queryLang);
    } catch (validationErr) {
      const statusCode = validationErr.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: validationErr.message });
    }

    const [jobRows] = await db.query(
      `SELECT
         jp.id,
         jp.title,
         jp.description,
         jp.requirements,
         jp.salary_range,
         jp.location,
         jp.salary_min,
         jp.salary_max,
         jp.work_type,
         jp.work_time,
         jp.verification_status,
         jp.is_active,
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
        WHERE sp.job_id = ?
        ORDER BY sp.id ASC`,
      [id]
    );

    const data = {
      id: job.id,
      job_title: job.title,
      job_description: job.description,
      requirements: job.requirements ?? null,
      salary_range: job.salary_range ?? null,
      location: job.location ?? null,
      salary_min: job.salary_min ?? null,
      salary_max: job.salary_max ?? null,
      work_type: job.work_type ?? null,
      work_time: job.work_time ?? null,
      verification_status: job.verification_status,
      is_active: job.is_active,
      total_applications: job.total_applications,
      selection_stages: selectionStages,
    };

    // ---- translations (sekali saja) ----
    if (!langInfo.isDefault) {
      if (langInfo.lang === "all") {
        data.translations = await translationService.getAllCachedTranslations(job.id);
      } else {
        const t = await translationService.getJobTranslation(job.id, langInfo.lang);
        if (t) data.translations = { [langInfo.lang]: t };
      }
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("Get job details error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
