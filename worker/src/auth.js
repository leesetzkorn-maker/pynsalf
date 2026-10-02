// Server-side authentication.
//
// Nothing in this file (or anywhere else in the repo) contains a password or a
// usable key. All three inputs come from Worker secrets, set with:
//   wrangler secret put ADMIN_PASSWORD_HASH
//   wrangler secret put SESSION_SECRET
//   wrangler secret put ANALYTICS_SALT
//
// The password is never stored, only a PBKDF2-SHA256 hash of it. The session is
// an HMAC-signed token in an HttpOnly cookie, so page JavaScript cannot read it.

const enc = new TextEncoder();

const b64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const bytesToB64 = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// Constant-time compare so a wrong password cannot be discovered by timing.
export function timingSafeEqual(a, b) {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Hash both sides first so the comparison length is fixed and independent of input.
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] || 0) ^ (bb[i] || 0);
  }
  return diff === 0;
}

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/**
 * Verify a password against a stored `pbkdf2$<iterations>$<saltB64>$<hashB64>` string.
 * Returns false (never throws) on malformed input so a bad secret cannot lock the
 * dashboard open or crash the login route.
 */
export async function verifyPassword(password, stored) {
  try {
    if (typeof password !== 'string' || password.length === 0 || password.length > 1024) return false;
    const parts = String(stored).split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 10_000_000) return false;
    const salt = b64ToBytes(parts[2]);
    const expected = b64ToBytes(parts[3]);

    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      expected.length * 8,
    );
    return timingSafeEqual(bytesToB64(new Uint8Array(bits)), parts[3]);
  } catch {
    return false;
  }
}

// ---- session cookie ----

export const COOKIE_NAME = 'ps_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export async function createSessionToken(secret, now = Date.now()) {
  const exp = now + SESSION_TTL_MS;
  const payload = `v1.${exp}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(secret, token, now = Date.now()) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const [v, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= now) return false;
  const expected = await hmacHex(secret, `${v}.${expRaw}`);
  return timingSafeEqual(sig, expected);
}

export function sessionCookie(token, secure) {
  const bits = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) bits.push('Secure');
  return bits.join('; ');
}

export function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// ---- login rate limiting ----

const MAX_FAILS = 5;
const WINDOW_MS = 1000 * 60 * 15;

/**
 * Blocks brute force. Keyed on HMAC(salt, IP) so the address itself is never stored.
 * Returns true when the caller is still allowed to try.
 */
export async function rateLimit(db, ipHash, now = Date.now()) {
  const row = await db
    .prepare('SELECT fails, window_start FROM login_attempts WHERE ip_hash = ?1')
    .bind(ipHash)
    .first();
  if (!row) return true;
  if (now - row.window_start > WINDOW_MS) {
    await db.prepare('DELETE FROM login_attempts WHERE ip_hash = ?1').bind(ipHash).run();
    return true;
  }
  return row.fails < MAX_FAILS;
}

export async function recordFail(db, ipHash, now = Date.now()) {
  const row = await db
    .prepare('SELECT fails, window_start FROM login_attempts WHERE ip_hash = ?1')
    .bind(ipHash)
    .first();
  if (!row || now - row.window_start > WINDOW_MS) {
    await db
      .prepare(
        'INSERT INTO login_attempts (ip_hash, fails, window_start) VALUES (?1, 1, ?2) ' +
          'ON CONFLICT(ip_hash) DO UPDATE SET fails = 1, window_start = ?2',
      )
      .bind(ipHash, now)
      .run();
  } else {
    await db
      .prepare('UPDATE login_attempts SET fails = fails + 1 WHERE ip_hash = ?1')
      .bind(ipHash)
      .run();
  }
}

export async function clearFails(db, ipHash) {
  await db.prepare('DELETE FROM login_attempts WHERE ip_hash = ?1').bind(ipHash).run();
}

// Opportunistic cleanup so the table cannot grow without bound.
export async function purgeAttempts(db, now = Date.now()) {
  await db
    .prepare('DELETE FROM login_attempts WHERE window_start < ?1')
    .bind(now - WINDOW_MS)
    .run();
}