const { db } = require("../config/database");

const CACHE_TTL_DAYS = 7;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

const isFresh = (updatedAt) => {
  if (!updatedAt) return false;
  const updatedTime = new Date(updatedAt).getTime();
  return Number.isFinite(updatedTime) && Date.now() - updatedTime < CACHE_TTL_MS;
};

const parseTranslation = (row) => {
  if (!row) return null;
  if (!row.translation_data) return null;

  try {
    return JSON.parse(row.translation_data);
  } catch (error) {
    console.warn("⚠️  Failed to parse translation cache, ignoring", error);
    return null;
  }
};

const getTranslationRow = async (jobId, languageCode) => {
  const [rows] = await db.query(
    `SELECT job_id, language_code, translation_data, updated_at
     FROM job_post_translations
     WHERE job_id = ? AND language_code = ?
     LIMIT 1`,
    [jobId, languageCode]
  );

  return rows?.[0] ?? null;
};

const saveTranslation = async (jobId, languageCode, translation) => {
  const payload = translation ? JSON.stringify(translation) : null;

  await db.query(
    `INSERT INTO job_post_translations (job_id, language_code, translation_data, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       translation_data = VALUES(translation_data),
       updated_at = VALUES(updated_at)`,
    [jobId, languageCode, payload]
  );

  return translation;
};

const getCachedTranslation = async (jobId, languageCode) => {
  const row = await getTranslationRow(jobId, languageCode);
  if (row && isFresh(row.updated_at)) {
    return parseTranslation(row);
  }
  return null;
};

const getTranslationWithFallback = async (jobId, languageCode, fetchFn) => {
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn must be a function that returns translation data");
  }

  const row = await getTranslationRow(jobId, languageCode);
  const cached = row && isFresh(row.updated_at) ? parseTranslation(row) : null;
  if (cached) {
    return cached;
  }

  const freshData = await fetchFn();
  if (freshData !== undefined) {
    await saveTranslation(jobId, languageCode, freshData);
  }

  return freshData ?? null;
};

module.exports = {
  getCachedTranslation,
  getTranslationWithFallback,
  saveTranslation,
};
