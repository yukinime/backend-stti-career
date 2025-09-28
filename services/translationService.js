const { db } = require("../config/database");

const jobTranslationCache = new Map();

const buildJobKey = (jobId, lang) => `job:${jobId}:${lang}`;

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

const duplicateTranslation = (base = {}, lang) => {
  if (!base) return null;
  const suffix = lang ? ` (${lang.toUpperCase()})` : "";
  const translated = {};
  for (const [key, value] of Object.entries(base)) {
    if (typeof value === "string" && value.trim()) {
      translated[key] = `${value}${suffix}`;
    } else {
      translated[key] = value ?? null;
    }
  }
  translated.lang = lang;
  return translated;
};

const fetchJobBaseData = async (jobId) => {
  const [rows] = await db.query(
    "SELECT title, description, requirements FROM job_posts WHERE id = ?",
    [jobId]
  );
  if (!rows.length) return null;
  return normalizeJobSource(rows[0]);
};

const warmJobTranslation = async (jobId, lang, baseData) => {
  if (!lang || lang === "id") return null;
  const key = buildJobKey(jobId, lang);

  let source = baseData;
  if (!source) {
    source = await fetchJobBaseData(jobId);
  }
  if (!source) return null;

  const translation = duplicateTranslation(source, lang);
  jobTranslationCache.set(key, translation);
  return translation;
};

const refreshJobTranslations = async (jobId, langs = [], baseData = null) => {
  const targets = (Array.isArray(langs) ? langs : []).filter(
    (lang) => lang && lang !== "id"
  );

  if (!targets.length) return;

  const normalizedBase = baseData ? normalizeJobSource(baseData) : null;
  const dbSource = await fetchJobBaseData(jobId);
  const source = mergeJobSource(normalizedBase, dbSource || {});

  if (!Object.keys(source).length) return;

  await Promise.all(targets.map((lang) => warmJobTranslation(jobId, lang, source)));
};

const getJobTranslation = async (jobId, lang) => {
  if (!lang || lang === "id") return null;
  const key = buildJobKey(jobId, lang);
  if (jobTranslationCache.has(key)) {
    return jobTranslationCache.get(key);
  }
  return warmJobTranslation(jobId, lang);
};

module.exports = {
  getJobTranslation,
  refreshJobTranslations,
};
