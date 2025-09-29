const { db } = require("../config/database");
const cache = require('../utils/translationCache');
const gtx = require('../utils/googleTranslateClient'); 

// ===== Label enum multi-bahasa (tanpa pakai API Translate) =====
const ENUM_LABELS = {
  id: {
    work_type: {
      on_site: 'WFO (On-site)',
      remote: 'WFH (Remote)',
      hybrid: 'Hybrid',
      field: 'Lapangan / Mobile',
    },
    work_time: {
      full_time: 'Full-time',
      part_time: 'Part-time',
      freelance: 'Freelance',
      internship: 'Magang',
      contract: 'Kontrak',
      volunteer: 'Relawan',
      seasonal: 'Musiman',
    },
    verification_status: {
      pending: 'Menunggu verifikasi',
      verified: 'Terverifikasi',
      rejected: 'Ditolak',
    },
    is_active: {
      1: 'Aktif',
      0: 'Nonaktif',
    },
  },
  en: {
    work_type: {
      on_site: 'On-site (WFO)',
      remote: 'Remote (WFH)',
      hybrid: 'Hybrid',
      field: 'Field Work / Mobile',
    },
    work_time: {
      full_time: 'Full-time',
      part_time: 'Part-time',
      freelance: 'Freelance',
      internship: 'Internship',
      contract: 'Contract',
      volunteer: 'Volunteer',
      seasonal: 'Seasonal',
    },
    verification_status: {
      pending: 'Pending review',
      verified: 'Verified',
      rejected: 'Rejected',
    },
    is_active: {
      1: 'Active',
      0: 'Inactive',
    },
  },
  ja: {
    work_type: {
      on_site: '出社 (On-site)',
      remote: 'リモート (WFH)',
      hybrid: 'ハイブリッド',
      field: 'フィールドワーク / モバイル',
    },
    work_time: {
      full_time: 'フルタイム',
      part_time: 'パートタイム',
      freelance: 'フリーランス',
      internship: 'インターンシップ',
      contract: '契約',
      volunteer: 'ボランティア',
      seasonal: 'シーズナル',
    },
    verification_status: {
      pending: '審査中',
      verified: '承認済み',
      rejected: '却下',
    },
    is_active: {
      1: '有効',
      0: '無効',
    },
  },
};

// Ambil row job dari DB (untuk normalize & label)
async function getJobBase(jobId) {
  const [rows] = await db.query(
    `SELECT id, title, description, requirements, salary_range, location,
            work_type, work_time, verification_status, is_active
     FROM job_posts WHERE id = ? LIMIT 1`,
    [jobId]
  );
  return rows[0] || null;
}

// Field mana yang kita terjemahkan pakai API (string bebas)
function buildTranslatable(row) {
  return {
    job_title: row?.title || null,
    job_description: row?.description || null,
    requirements: row?.requirements || null,
    salary_range: row?.salary_range || null,
    location: row?.location || null,
  };
}

// Tambahkan label enum sesuai bahasa (tanpa API)
function addEnumLabels(row, lang) {
  const L = ENUM_LABELS[lang] || ENUM_LABELS.en;
  return {
    work_type_label: row?.work_type ? (L.work_type[row.work_type] || row.work_type) : null,
    work_time_label: row?.work_time ? (L.work_time[row.work_time] || row.work_time) : null,
    verification_status_label: row?.verification_status
      ? (L.verification_status[row.verification_status] || row.verification_status)
      : null,
    is_active_label: row?.is_active != null
      ? (L.is_active[String(row.is_active ? 1 : 0)] || String(row.is_active))
      : null,
  };
}

// Translate semua field string yang perlu translate (skip null/empty)
async function translateObjectStrings(obj, targetLang) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'string' && v.trim()) {
      out[k] = await gtx.translateText(v, targetLang);
    } else {
      out[k] = v ?? null;
    }
  }
  return out;
}

const {
  getCachedTranslation,
  getTranslationWithFallback,
  saveTranslation,
} = require("../utils/translationCache");
const { translateFields } = require("./googleTranslateClient");

const DEFAULT_SOURCE_LANG = "id";

const normalizeJobSource = (source = {}) => ({
  job_title: source.job_title ?? source.title ?? null,
  job_description: source.job_description ?? source.description ?? null,
  requirements: source.requirements ?? null,
});

const mergeJobSource = (primary = {}, fallback = {}) => {
  const output = { ...fallback };
  if (!primary) return output;
  for (const [key, value] of Object.entries(primary)) {
    if (value !== undefined && value !== null) {
      output[key] = value;
    }
  }
  return output;
};

const hasTranslatableContent = (payload = {}) =>
  Object.values(payload).some((value) => typeof value === "string" && value.trim());

const fetchJobBaseData = async (jobId) => {
  const [rows] = await db.query(
    "SELECT title, description, requirements FROM job_posts WHERE id = ?",
    [jobId]
  );
  if (!rows.length) return null;
  return normalizeJobSource(rows[0]);
};

const mapTranslationForResponse = (translation, lang) => {
  if (!translation) return null;
  const payload = { ...translation };
  payload.lang = lang;
  return payload;
};

const getAllCachedTranslations = async (jobId) => {
  const [rows] = await db.query(
    `SELECT language_code FROM job_post_translations WHERE job_id = ?`,
    [jobId]
  );

  if (!rows.length) {
    return {};
  }

  const translations = {};
  await Promise.all(
    rows.map(async ({ language_code: languageCode }) => {
      const cached = await getCachedTranslation(jobId, languageCode);
      if (cached) {
        translations[languageCode] = mapTranslationForResponse(
          cached,
          languageCode
        );
      }
    })
  );

  return translations;
};

const translateJobFields = async (lang, base) => {
  if (!base || !lang || lang === DEFAULT_SOURCE_LANG) {
    return null;
  }

  const translated = await translateFields(base, lang, {
    sourceLanguageCode: DEFAULT_SOURCE_LANG,
  });

  if (!translated) {
    return null;
  }

  return {
    job_title: translated.job_title ?? null,
    job_description: translated.job_description ?? null,
    requirements: translated.requirements ?? null,
    lang,
  };
};

// Ambil terjemahan (pakai cache). Jika belum ada di cache, generate & simpan.
async function getJobTranslation(jobId, lang) {
  // 1) coba ambil dari cache
  const cached = await cache.getTranslationWithFallback(jobId, lang);
  if (cached) return cached;

  // 2) ambil base row dari DB
  const base = await getJobBase(jobId);
  if (!base) return null;

  // 3) translate string bebas
  const toTranslate = buildTranslatable(base);
  const translatedStrings = await translateObjectStrings(toTranslate, lang);

  // 4) label enum (tanpa API)
  const enumLabels = addEnumLabels(base, lang);

  const payload = { ...translatedStrings, ...enumLabels, lang };

  // 5) simpan ke cache
  await cache.saveTranslation(jobId, lang, payload);
  return payload;
}
module.exports.getJobTranslation = getJobTranslation;

// Pre-warm / refresh cache untuk banyak bahasa (dipanggil saat create/update job)
async function refreshJobTranslations(jobId, langs = ['en', 'ja'], basePayload = null) {
  // Ambil base row (prioritas payload kalau ada, kalau tidak fetch DB)
  let base = basePayload;
  if (!base || typeof base !== 'object') {
    base = await getJobBase(jobId);
  } else {
    // samakan nama-atribut dengan kolom DB agar helper bekerja
    base = {
      title: base.title ?? base.job_title ?? base.title,
      description: base.description ?? base.job_description ?? base.description,
      requirements: base.requirements ?? base.requirement ?? base.requirements,
      salary_range: base.salary_range ?? base.salaryRange ?? base.salary_range,
      location: base.location ?? base.location,
      work_type: base.work_type ?? base.workType ?? base.work_type,
      work_time: base.work_time ?? base.workTime ?? base.work_time,
      verification_status: base.verification_status ?? base.verification_status,
      is_active: base.is_active ?? base.is_active,
    };
  }

  if (!base) return;

  for (const lang of langs) {
    try {
      const toTranslate = buildTranslatable(base);
      const translatedStrings = await translateObjectStrings(toTranslate, lang);
      const enumLabels = addEnumLabels(base, lang);
      const payload = { ...translatedStrings, ...enumLabels, lang };
      await cache.saveTranslation(jobId, lang, payload);
    } catch (e) {
      console.error(`refreshJobTranslations error [job=${jobId}, lang=${lang}]:`, e);
    }
  }
}
module.exports = {
  getJobTranslation,
  refreshJobTranslations,
  getAllCachedTranslations,
};