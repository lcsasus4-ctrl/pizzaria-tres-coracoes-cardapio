const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encodeSession(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function decodeSession(token, secret) {
  if (!token || !secret) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  return cookieHeader.split(';').reduce((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed) return acc;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return acc;
    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function createSessionCookie(username, secret) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = encodeSession({ sub: username, exp: expiresAt }, secret);
  const expires = new Date(expiresAt).toUTCString();
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expires}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function unauthorized(body = 'Unauthorized') {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: body })
  };
}

function verifyLogin(username, password) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUsername || !expectedPasswordHash) {
    throw new Error('Admin credentials are not configured');
  }

  return username === expectedUsername && sha256(password) === expectedPasswordHash;
}

function requireSession(event) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured');
  }

  const cookies = parseCookies(event);
  return decodeSession(cookies[SESSION_COOKIE_NAME], secret);
}

module.exports = {
  clearSessionCookie,
  createSessionCookie,
  requireSession,
  unauthorized,
  verifyLogin
};
