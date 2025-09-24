// utils/url.js
function getBaseUrl(req) {
  const fromEnv = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv; // pakai env kalau ada
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host  = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

// Bangun URL: /uploads/<folder>/<filename>
function buildUploadUrl(req, folder, filename) {
  if (!filename) return null;
  const cleanFolder = String(folder || '').replace(/^\/+|\/+$/g, '');
  const cleanFile = String(filename || '').replace(/^\/+/, '');
  return `${getBaseUrl(req)}/uploads/${cleanFolder}/${cleanFile}`;
}

// Bebas path relatif → URL absolut
function buildPublicUrl(req, relativePath) {
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return `${getBaseUrl(req)}/${clean}`;
}

module.exports = { getBaseUrl, buildPublicUrl, buildUploadUrl };
