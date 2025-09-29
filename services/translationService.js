// services/translationService.js
const { db } = require("../config/database");
const { translateFields } = require("./googleTranslateClient");

// ⬇️ FUNGSI INI WAJIB DI ATAS PEMAKAIAN
function normalizeTranslationShape(src = {}, lang = "id") {
  let v = src;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch (_) { v = {}; } }
  const toStrOrNull = (x) => (x === undefined || x === null) ? null : String(x);
  return {
    job_title: toStrOrNull(v.job_title),
    job_description: toStrOrNull(v.job_description),
    requirements: (v.requirements == null) ? null : String(v.requirements),
    salary_range: toStrOrNull(v.salary_range),
    location: toStrOrNull(v.location),
    work_type_label: toStrOrNull(v.work_type_label),
    work_time_label: toStrOrNull(v.work_time_label),
    verification_status_label: toStrOrNull(v.verification_status_label),
    is_active_label: toStrOrNull(v.is_active_label),
    lang,
  };
}

const {
  getCachedTranslation,
  getTranslationWithFallback, // kalau tak dipakai, boleh dihapus impor ini
  saveTranslation,
} = require("../utils/translationCache");

// --- Normalizer: rapihin bentuk data terjemahan yang dibaca dari cache DB ---

const DEFAULT_SOURCE_LANG = "id";

// Label enum non-API (hemat kuota) untuk work_type, work_time, dst.
const ENUM_LABELS = {
  id: {
    work_type: {
      on_site: "On-site / WFO",
      remote: "Remote / WFH",
      hybrid: "Hybrid",
      field: "Field Work / Mobile",
    },
    work_time: {
      full_time: "Penuh waktu",
      part_time: "Paruh waktu",
      freelance: "Freelance",
      internship: "Magang",
      contract: "Kontrak",
      volunteer: "Relawan",
      seasonal: "Musiman",
    },
    verification_status: {
      pending: "Menunggu verifikasi",
      verified: "Terverifikasi",
      rejected: "Ditolak",
    },
    is_active: {
      1: "Aktif",
      0: "Nonaktif",
    },
  },
  en: {
    work_type: {
      on_site: "On-site / WFO",
      remote: "Remote / WFH",
      hybrid: "Hybrid",
      field: "Field Work / Mobile",
    },
    work_time: {
      full_time: "Full-time",
      part_time: "Part-time",
      freelance: "Freelance",
      internship: "Internship",
      contract: "Contract",
      volunteer: "Volunteer",
      seasonal: "Seasonal",
    },
    verification_status: {
      pending: "Pending review",
      verified: "Verified",
      rejected: "Rejected",
    },
    is_active: {
      1: "Active",
      0: "Inactive",
    },
  },
  ja: {
    work_type: {
      on_site: "出社 (On-site)",
      remote: "リモート (WFH)",
      hybrid: "ハイブリッド",
      field: "フィールドワーク / モバイル",
    },
    work_time: {
      full_time: "フルタイム",
      part_time: "パートタイム",
      freelance: "フリーランス",
      internship: "インターンシップ",
      contract: "契約",
      volunteer: "ボランティア",
      seasonal: "シーズナル",
    },
    verification_status: {
      pending: "審査中",
      verified: "承認済み",
      rejected: "却下",
    },
    is_active: {
      1: "有効",
      0: "無効",
    },
  },
};

// --- Helpers ---

// Ambil row lengkap yang kita perlu untuk translate + label
const fetchJobBaseData = async (jobId) => {
  const [rows] = await db.query(
    `SELECT
       id, title, description, requirements, salary_range, location,
       work_type, work_time, verification_status, is_active
     FROM job_posts
     WHERE id = ?
     LIMIT 1`,
    [jobId]
  );
  if (!rows.length) return null;
  return rows[0];
};

// Field string yang akan diterjemahkan ke target language (pakai API)
const buildTranslatable = (row) => ({
  job_title: row?.title ?? null,
  job_description: row?.description ?? null,
  requirements: row?.requirements ?? null,
  salary_range: row?.salary_range ?? null,
  location: row?.location ?? null,
});

// Label enum lokal (tanpa API)
const addEnumLabels = (row, lang) => {
  const L = ENUM_LABELS[lang] || ENUM_LABELS.en;
  return {
    work_type_label: row?.work_type ? (L.work_type[row.work_type] || row.work_type) : null,
    work_time_label: row?.work_time ? (L.work_time[row.work_time] || row.work_time) : null,
    verification_status_label: row?.verification_status
      ? (L.verification_status[row.verification_status] || row.verification_status)
      : null,
    is_active_label:
      row?.is_active != null
        ? (L.is_active[String(row.is_active ? 1 : 0)] || String(row.is_active))
        : null,
  };
};

// Cek apakah ada string yg perlu diterjemahkan
const hasTranslatableContent = (obj = {}) =>
  Object.values(obj).some((v) => typeof v === "string" && v.trim());

// Terapkan Google Translate untuk banyak field sekaligus (hemat kuota)
const translateJobFields = async (lang, baseStrings) => {
  if (!lang || lang === DEFAULT_SOURCE_LANG) return null;
  if (!baseStrings || !hasTranslatableContent(baseStrings)) return null;

  // translateFields = wrapper Cloud Translate v3 yang kamu punya
  // (batch translate per object)
  const translated = await translateFields(baseStrings, lang, {
    sourceLanguageCode: DEFAULT_SOURCE_LANG,
  }); // 

  return {
    job_title: translated.job_title ?? null,
    job_description: translated.job_description ?? null,
    requirements: translated.requirements ?? null,
    salary_range: translated.salary_range ?? null,
    location: translated.location ?? null,
  };
};

// Kembalikan payload siap kirim untuk 1 bahasa (gabung string terjemahan + label enum)
const buildTranslationPayload = (row, lang, translatedStrings) => ({
  ...(translatedStrings || {}),
  ...addEnumLabels(row, lang), // label non-API
  lang,
});

// Ambil semua language yg sudah tercache untuk job tertentu
const getAllCachedTranslations = async (jobId) => {
  const [rows] = await db.query(
    `SELECT language_code FROM job_post_translations WHERE job_id = ?`,
    [jobId]
  );
  if (!rows.length) return {};
  const bag = {};
  await Promise.all(
    rows.map(async ({ language_code }) => {
      const cached = await getCachedTranslation(jobId, language_code);
      if (cached) bag[language_code] = { ...cached, lang: language_code };
    })
  );
  return bag;
};

// === Public API ===

// GET terjemahan 1 bahasa atau "all"
async function getJobTranslation(jobId, lang) {
  // 1) Cek cache tabel job_post_translations
  const [cacheRows] = await db.query(
    `SELECT translation_data
     FROM job_post_translations
     WHERE job_id = ? AND language_code = ?
     LIMIT 1`,
    [jobId, lang]
  );

  if (cacheRows.length) {
    const raw = cacheRows[0].translation_data;
    const normalized = normalizeTranslationShape(raw, lang);
    return { [lang]: normalized };
  }

  // 2) Ambil data dasar dari DB
  const [jobRows] = await db.query(
    `SELECT
       id, title, description, requirements,
       salary_range, location, salary_min, salary_max,
       work_type, work_time, verification_status, is_active
     FROM job_posts
     WHERE id = ?
     LIMIT 1`,
    [jobId]
  );

  if (!jobRows.length) return { [lang]: null };

  const j = jobRows[0];

  // Label ID (biar gampang diterjemahkan oleh translateFields)
  const workTypeLabelId = {
    on_site: "On-site (WFO)",
    remote: "Remote (WFH)",
    hybrid: "Hybrid",
    field: "Field Work / Mobile",
  }[j.work_type] || "";

  const workTimeLabelId = {
    full_time: "Full-time",
    part_time: "Part-time",
    freelance: "Freelance",
    internship: "Internship",
    contract: "Contract",
    volunteer: "Volunteer",
    seasonal: "Seasonal",
  }[j.work_time] || "";

  const verificationLabelId = {
    pending: "Menunggu verifikasi",
    verified: "Terverifikasi",
    rejected: "Ditolak",
  }[j.verification_status] || "";

  const isActiveLabelId = j.is_active ? "Aktif" : "Nonaktif";

  // Base yang dikirim ke translator (semua field penting ikut)
  const base = {
    job_title: j.title || "",
    job_description: j.description || "",
    requirements: j.requirements || "",
    salary_range: j.salary_range || "",
    location: j.location || "",
    // info enum -> label
    work_type_label: workTypeLabelId,
    work_time_label: workTimeLabelId,
    verification_status_label: verificationLabelId,
    is_active_label: isActiveLabelId,
  };

  // 3) Terjemahkan (HASIL HARUS PLAIN OBJECT, BUKAN dibungkus lang)
  const translated = await translateFields(base, lang, {
    labels: {} // kalau kamu mau kirim mapping tambahan, taruh di sini
  });

  // 4) Simpan ke cache DB: simpan PLAIN OBJECT (jangan dibungkus {lang: ...})
  await db.query(
    `INSERT INTO job_post_translations (job_id, language_code, translation_data)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       translation_data = VALUES(translation_data),
       updated_at = CURRENT_TIMESTAMP`,
    [jobId, lang, JSON.stringify(translated)]
  );

  // 5) Return dengan WRAP SEKALI { [lang]: ... }
  return { [lang]: translated };
}

// Pre-warm / refresh cache (dipanggil saat CREATE/UPDATE job)
async function refreshJobTranslations(jobId, langs = ["en", "ja"], basePayload = null) {
  const targets = (Array.isArray(langs) ? langs : []).filter(
    (l) => l && l !== DEFAULT_SOURCE_LANG
  );
  if (!targets.length) return;

  // sumber data: pakai payload yg dikirim (kalau ada), fallback DB
  let row = null;
  if (basePayload && typeof basePayload === "object") {
    row = {
      id: jobId,
      title: basePayload.title ?? basePayload.job_title ?? null,
      description: basePayload.description ?? basePayload.job_description ?? null,
      requirements: basePayload.requirements ?? null,
      salary_range: basePayload.salary_range ?? basePayload.salaryRange ?? null,
      location: basePayload.location ?? null,
      work_type: basePayload.work_type ?? basePayload.workType ?? null,
      work_time: basePayload.work_time ?? basePayload.workTime ?? null,
      verification_status: basePayload.verification_status ?? null,
      is_active: basePayload.is_active ?? null,
    };
  } else {
    row = await fetchJobBaseData(jobId);
  }
  if (!row) return;

  const baseStrings = buildTranslatable(row);

  await Promise.all(
    targets.map(async (lang) => {
      try {
        const translatedStrings = await translateJobFields(lang, baseStrings);
        if (!translatedStrings) return;
        const payload = buildTranslationPayload(row, lang, translatedStrings);
        await saveTranslation(jobId, lang, payload);
      } catch (e) {
        console.error(`refreshJobTranslations error [job=${jobId}, lang=${lang}]:`, e);
      }
    })
  );
}

module.exports = {
  getJobTranslation,
  refreshJobTranslations,
  getAllCachedTranslations,
};
