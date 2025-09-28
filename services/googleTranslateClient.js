const { TranslationServiceClient } = require("@google-cloud/translate").v3;

let projectId = process.env.GOOGLE_TRANSLATE_PROJECT_ID;
const location = process.env.GOOGLE_TRANSLATE_LOCATION || "global";

const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const rawCredentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

let clientOptions = {};
let hasExplicitCredentials = false;

if (rawCredentialsJson && rawCredentialsJson.trim().length > 0) {
  try {
    const credentials = JSON.parse(rawCredentialsJson);

    if (!projectId && typeof credentials.project_id === "string") {
      projectId = credentials.project_id;
    }

    clientOptions.credentials = {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    };
    hasExplicitCredentials = true;
  } catch (err) {
    console.error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON value", err);
  }
}

if (!hasExplicitCredentials && keyFilePath && keyFilePath.trim().length > 0) {
  clientOptions.keyFilename = keyFilePath.trim();
}

if (Object.keys(clientOptions).length === 0) {
  clientOptions = null;
}

let client = null;
let parentPath = null;

if (projectId) {
  client = new TranslationServiceClient(clientOptions || undefined);
  parentPath = `projects/${projectId}/locations/${location}`;
} else {
  console.warn(
    "⚠️  GOOGLE_TRANSLATE_PROJECT_ID is not set. Translation service is disabled."
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, { attempts = 3, baseDelayMs = 500, factor = 2 } = {}) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= attempts) break;
      const delay = baseDelayMs * factor ** (attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError;
};

const translateBatch = async (contents, targetLanguageCode, sourceLanguageCode) => {
  if (!client || !parentPath) {
    throw new Error("Google Translate client is not configured");
  }

  const request = {
    parent: parentPath,
    contents,
    mimeType: "text/plain",
    targetLanguageCode,
  };

  if (sourceLanguageCode) {
    request.sourceLanguageCode = sourceLanguageCode;
  }

  const [response] = await withRetry(() => client.translateText(request));

  if (!response || !Array.isArray(response.translations)) {
    return [];
  }

  return response.translations.map((item) => item.translatedText || "");
};

const translateFields = async (
  fields = {},
  targetLanguageCode,
  { sourceLanguageCode = "id" } = {}
) => {
  if (!targetLanguageCode || targetLanguageCode === sourceLanguageCode) {
    return { ...fields };
  }

  const entries = Object.entries(fields).filter(([, value]) =>
    typeof value === "string" && value.trim().length > 0
  );

  if (entries.length === 0) {
    return { ...fields };
  }

  try {
    const translations = await translateBatch(
      entries.map(([, value]) => value),
      targetLanguageCode,
      sourceLanguageCode
    );

    const output = { ...fields };
    entries.forEach(([key], index) => {
      if (translations[index]) {
        output[key] = translations[index];
      }
    });

    return output;
  } catch (err) {
    console.error(
      `Google Translate error for target ${targetLanguageCode}:`,
      err
    );
    throw err;
  }
};

module.exports = {
  translateFields,
};
