// utils/url.js
function getBaseUrl(req) {
  // PRIORITAS: PUBLIC_URL (kalau di-prod set ke domain Railway kamu)
  const fromEnv = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;

  // fallback dari header / request (mendukung proxy)
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host  = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

function buildPublicUrl(req, relativePath) {
  const base = getBaseUrl(req);
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return `${base}/${clean}`;
}

function buildUploadUrl(req, type /* 'images'|'files' */, filename) {
  if (!filename) return null;
  const base = getBaseUrl(req);
  return `${base}/uploads/${type}/${filename}`;
}

module.exports = {
  getBaseUrl,
  buildPublicUrl,
  buildUploadUrl
};
