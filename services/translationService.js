const { db } = require("../config/database");
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

const getJobTranslation = async (jobId, lang) => {
  if (!lang || lang === DEFAULT_SOURCE_LANG) {
    return null;
  }

  if (lang === "all") {
    const base = await fetchJobBaseData(jobId);
    const translations = await getAllCachedTranslations(jobId);
    if (base) {
      translations[DEFAULT_SOURCE_LANG] = {
        ...base,
        lang: DEFAULT_SOURCE_LANG,
      };
    }
    return Object.keys(translations).length ? translations : null;
  }

  const fetchFn = async () => {
    const base = await fetchJobBaseData(jobId);
    if (!base || !hasTranslatableContent(base)) {
      return null;
    }

    const payload = await translateJobFields(lang, base);
    if (!payload) {
      return null;
    }

    return payload;
  };

  const translation = await getTranslationWithFallback(jobId, lang, fetchFn);
  if (!translation) {
    return null;
  }

  return { [lang]: mapTranslationForResponse(translation, lang) };
};

const refreshJobTranslations = async (jobId, langs = [], baseData = null) => {
  const targets = (Array.isArray(langs) ? langs : []).filter(
    (target) => target && target !== DEFAULT_SOURCE_LANG
  );

  if (!targets.length) {
    return;
  }

  const normalizedBase = baseData ? normalizeJobSource(baseData) : null;
  const dbSource = await fetchJobBaseData(jobId);
  const source = mergeJobSource(normalizedBase, dbSource || {});

  if (!source || !hasTranslatableContent(source)) {
    return;
  }

  await Promise.all(
    targets.map(async (lang) => {
      try {
        const payload = await translateJobFields(lang, source);
        if (payload) {
          await saveTranslation(jobId, lang, payload);
        }
      } catch (err) {
        console.error(
          `Job translation refresh error for job ${jobId} (${lang}):`,
          err
        );
      }
    })
  );
};

module.exports = {
  getJobTranslation,
  refreshJobTranslations,
};
