'use strict';

/**
 * Google Cloud Translate service helper.
 *
 * NOTE: Never commit service account JSON keys to the repository. Store the
 * credential file outside of git and expose its absolute path via the
 * GOOGLE_APPLICATION_CREDENTIALS environment variable.
 */
const {TranslationServiceClient} = require('@google-cloud/translate').v3;

const clientOptions = {};
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credentialsPath) {
  clientOptions.keyFilename = credentialsPath;
}

let translationClient;

function getProjectId() {
  const projectId = process.env.GOOGLE_TRANSLATE_PROJECT_ID;
  if (!projectId) {
    throw new Error('GOOGLE_TRANSLATE_PROJECT_ID environment variable is required');
  }

  return projectId;
}

function getClient() {
  if (!translationClient) {
    translationClient = new TranslationServiceClient(clientOptions);
  }

  return translationClient;
}

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;
const SUPPORTED_FIELDS = ['title', 'description', 'requirements'];

function sleep(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function getLocation() {
  return process.env.GOOGLE_TRANSLATE_LOCATION || 'global';
}

function getParent() {
  return `projects/${getProjectId()}/locations/${getLocation()}`;
}

async function translateTextWithRetry(text, sourceLang, targetLang) {
  let attempt = 0;
  let delay = INITIAL_BACKOFF_MS;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    try {
      const request = {
        parent: getParent(),
        contents: [text ?? ''],
        mimeType: 'text/plain',
        targetLanguageCode: targetLang,
      };

      if (sourceLang) {
        request.sourceLanguageCode = sourceLang;
      }

      const [response] = await getClient().translateText(request);
      const [translation] = response.translations || [];
      return translation?.translatedText ?? '';
    } catch (error) {
      attempt += 1;
      console.error(
        `Translation API request failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`,
        error
      );

      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw error;
      }

      await sleep(delay);
      delay *= 2;
    }
  }

  return '';
}

async function translateFields({fields = {}, sourceLang, targetLang}) {
  if (!targetLang) {
    throw new Error('targetLang is required');
  }

  const result = {};
  for (const key of SUPPORTED_FIELDS) {
    const value = fields[key];
    if (value === undefined || value === null) {
      result[key] = value;
      continue;
    }

    if (value === '') {
      result[key] = '';
      continue;
    }

    if (typeof value !== 'string') {
      result[key] = value;
      continue;
    }

    result[key] = await translateTextWithRetry(value, sourceLang, targetLang);
  }

  return result;
}

module.exports = {
  translateFields,
};
