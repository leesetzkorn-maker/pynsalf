import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import app from '../src/index.js';

class LocalD1 {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
  }

  prepare(sql) {
    const db = this.sqlite;
    let values = [];
    const statement = {
      bind(...args) {
        values = args;
        return statement;
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null;
      },
      async all() {
        return { results: db.prepare(sql).all(...values) };
      },
      async run() {
        return { success: true, meta: db.prepare(sql).run(...values) };
      },
    };
    return statement;
  }

  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      for (const statement of statements) await statement.run();
      this.sqlite.exec('COMMIT');
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

const db = new LocalD1();
db.sqlite.exec(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 1_000, 32, 'sha256');
const origin = 'https://analytics.example';
const env = {
  DB: db,
  ASSETS: { fetch: async () => new Response('<!doctype html><title>Private dashboard</title>') },
  SITE_ORIGIN: 'https://leesetzkorn-maker.github.io',
  ENVIRONMENT: 'production',
  RETENTION_DAYS: '400',
  ADMIN_PASSWORD_HASH: `pbkdf2$1000$${salt.toString('base64')}$${hash.toString('base64')}`,
  SESSION_SECRET: randomBytes(32).toString('base64'),
  ANALYTICS_SALT: randomBytes(32).toString('base64'),
};

async function call(path, { method = 'GET', body, headers = {}, requestOrigin = origin } = {}) {
  return app.fetch(
    new Request(new URL(path, origin), {
      method,
      headers: { Origin: requestOrigin, ...headers },
      body,
    }),
    env,
  );
}

const locked = await call('/api/admin/stats');
assert.equal(locked.status, 401, 'Analytics API must reject unauthenticated visitors.');

const wrongLogin = await call('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
  body: JSON.stringify({ password: `${password}-wrong` }),
});
assert.equal(wrongLogin.status, 401, 'A wrong password must be rejected.');

const login = await call('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
  body: JSON.stringify({ password }),
});
assert.equal(login.status, 200, 'The matching password hash must permit sign-in.');
const setCookie = login.headers.get('Set-Cookie');
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /SameSite=Strict/);
assert.match(setCookie, /Secure/);
const cookie = setCookie.split(';', 1)[0];

const visitorId = randomBytes(24).toString('hex');
for (const event of ['page_view', 'whatsapp_click', 'phone_click', 'email_click', 'facebook_click']) {
  const response = await call('/api/collect', {
    method: 'POST',
    requestOrigin: env.SITE_ORIGIN,
    headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '203.0.113.2' },
    body: JSON.stringify({ event, visitorId, path: '/pynsalf/' }),
  });
  assert.equal(response.status, 202, `${event} should be accepted from the public site.`);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
}

const statsResponse = await call('/api/admin/stats', { headers: { Cookie: cookie } });
assert.equal(statsResponse.status, 200, 'Signed-in dashboard requests must succeed.');
const stats = await statsResponse.json();
assert.equal(stats.overview.totalVisitors, 1);
assert.equal(stats.overview.pageViews, 1);
assert.equal(stats.periods.today.newVisitors, 1);
assert.equal(stats.clicks.whatsapp, 1);
assert.equal(stats.clicks.phone, 1);
assert.equal(stats.clicks.email, 1);
assert.equal(stats.clicks.facebook, 1);
assert.equal(stats.daily.length, 30);
assert.equal(stats.daily.at(-1).pageViews, 1, 'CTA clicks must not be counted as page views.');

const rejectedOrigin = await call('/api/collect', {
  method: 'POST',
  requestOrigin: 'https://attacker.example',
  headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '203.0.113.3' },
  body: JSON.stringify({ event: 'page_view', visitorId, path: '/' }),
});
assert.equal(rejectedOrigin.status, 403, 'Cross-origin event submissions must be rejected.');

let limited;
for (let attempt = 0; attempt <= 120; attempt++) {
  limited = await call('/api/collect', {
    method: 'POST',
    requestOrigin: env.SITE_ORIGIN,
    headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '203.0.113.99' },
    body: JSON.stringify({ event: 'page_view', visitorId, path: '/' }),
  });
  if (attempt < 120) assert.equal(limited.status, 202);
}
assert.equal(limited.status, 429, 'Event rate limiting must reject abusive submissions.');

const adminPage = await call('/admin');
assert.equal(adminPage.status, 200);
assert.equal(adminPage.headers.get('X-Robots-Tag'), 'noindex, nofollow');
assert.equal(adminPage.headers.get('X-Frame-Options'), 'DENY');
assert.equal(adminPage.headers.get('Cache-Control'), 'no-store');

const logout = await call('/api/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
assert.equal(logout.status, 200);
assert.equal((await call('/api/admin/stats')).status, 401, 'Sign-out must revoke access.');

console.log('PASS: private API, password login, protected session, all five events,');
console.log('      30-day stats, accurate page views, origin/rate checks and sign-out.');
