import {
  clearCookie,
  clearFails,
  COOKIE_NAME,
  createSessionToken,
  hmacHex,
  purgeAttempts,
  rateLimit,
  readCookie,
  recordFail,
  sessionCookie,
  verifyPassword,
  verifySessionToken,
} from './auth.js';

const CLICK_EVENTS = new Set([
  'whatsapp_click',
  'phone_click',
  'email_click',
  'facebook_click',
]);
const EVENT_TYPES = new Set(['page_view', ...CLICK_EVENTS]);
const MAX_BODY_BYTES = 2048;
const DEFAULT_RETENTION_DAYS = 400;
const MAX_EVENTS_PER_IP_PER_MINUTE = 120;

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });

const error = (message, status) => json({ error: message }, status);

function dayInSouthAfrica(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const part = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${part.year}-${part.month}-${part.day}`;
}

function shiftDay(day, offset) {
  const [year, month, date] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + offset));
  return shifted.toISOString().slice(0, 10);
}

function mondayOf(day) {
  const [year, month, date] = day.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, date));
  const weekday = (d.getUTCDay() + 6) % 7;
  return shiftDay(day, -weekday);
}

function deviceFromRequest(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(userAgent)) return 'tablet';
  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) return 'tablet';
  if (request.headers.get('Sec-CH-UA-Mobile') === '?1') return 'mobile';
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

function countryFromRequest(request) {
  const country = request.cf?.country;
  return typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedPublicOrigin(origin, env)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function allowedPublicOrigin(origin, env) {
  if (origin === env.SITE_ORIGIN) return true;
  return env.ENVIRONMENT === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function sameOriginPost(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}

function secretsConfigured(env) {
  return (
    typeof env.ADMIN_PASSWORD_HASH === 'string' &&
    env.ADMIN_PASSWORD_HASH.startsWith('pbkdf2$') &&
    typeof env.SESSION_SECRET === 'string' &&
    env.SESSION_SECRET.length >= 32 &&
    typeof env.ANALYTICS_SALT === 'string' &&
    env.ANALYTICS_SALT.length >= 32 &&
    env.DB
  );
}

async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > maxBytes) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function adminAuthorized(request, env) {
  const token = readCookie(request, COOKIE_NAME);
  return verifySessionToken(env.SESSION_SECRET, token);
}

async function handleLogin(request, env) {
  if (!sameOriginPost(request)) return error('Request origin not allowed', 403);
  if (!secretsConfigured(env)) return error('Admin service is not configured', 503);

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return error('Login service is unavailable', 503);

  const ipHash = await hmacHex(env.ANALYTICS_SALT, `login:${ip}`);
  await purgeAttempts(env.DB);
  if (!(await rateLimit(env.DB, ipHash))) return error('Too many attempts. Try again later.', 429);

  const payload = await readJson(request);
  if (!payload || typeof payload.password !== 'string') {
    await recordFail(env.DB, ipHash);
    return error('Invalid email or password', 401);
  }

  if (!(await verifyPassword(payload.password, env.ADMIN_PASSWORD_HASH))) {
    await recordFail(env.DB, ipHash);
    return error('Invalid email or password', 401);
  }

  await clearFails(env.DB, ipHash);
  const token = await createSessionToken(env.SESSION_SECRET);
  return json(
    { authenticated: true },
    200,
    { 'Set-Cookie': sessionCookie(token, new URL(request.url).protocol === 'https:') },
  );
}

async function collectEvent(request, env) {
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') {
    if (!headers['Access-Control-Allow-Origin']) return error('Origin not allowed', 403);
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') return error('Method not allowed', 405);
  if (!headers['Access-Control-Allow-Origin']) return error('Origin not allowed', 403);
  if (!secretsConfigured(env)) return error('Analytics service is not configured', 503);

  const payload = await readJson(request);
  if (
    !payload ||
    !EVENT_TYPES.has(payload.event) ||
    typeof payload.visitorId !== 'string' ||
    !/^[A-Za-z0-9_-]{20,100}$/.test(payload.visitorId) ||
    typeof payload.path !== 'string' ||
    payload.path.length > 200 ||
    !payload.path.startsWith('/') ||
    payload.path.includes('?') ||
    payload.path.includes('#')
  ) {
    return error('Invalid analytics event', 400);
  }

  const now = Date.now();
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return error('Analytics service is unavailable', 503);
  const minute = Math.floor(now / 60_000);
  const bucketHash = await hmacHex(env.ANALYTICS_SALT, `collect:${minute}:${ip}`);
  const rate = await env.DB
    .prepare(
      'INSERT INTO analytics_limits (bucket_hash, hits, expires_at) VALUES (?1, 1, ?2) ' +
        'ON CONFLICT(bucket_hash) DO UPDATE SET hits = hits + 1 ' +
        'RETURNING hits',
    )
    .bind(bucketHash, now + 120_000)
    .first();
  if (!rate || rate.hits > MAX_EVENTS_PER_IP_PER_MINUTE) {
    return error('Event limit reached. Try again shortly.', 429);
  }

  const day = dayInSouthAfrica(now);
  const visitorHash = await hmacHex(env.ANALYTICS_SALT, `visitor:${payload.visitorId}`);
  const dayHash =
    payload.event === 'page_view'
      ? await hmacHex(env.ANALYTICS_SALT, `day:${day}:${payload.visitorId}`)
      : null;
  const device = deviceFromRequest(request);
  const country = countryFromRequest(request);
  const path = payload.path.slice(0, 200);

  if (payload.event === 'page_view') {
    await env.DB.batch([
      env.DB
        .prepare(
          'INSERT INTO visitors (visitor_hash, first_seen, last_seen) VALUES (?1, ?2, ?2) ' +
            'ON CONFLICT(visitor_hash) DO UPDATE SET last_seen = excluded.last_seen',
        )
        .bind(visitorHash, day),
      env.DB
        .prepare(
          'INSERT INTO events (ts, day, type, visitor_hash, day_hash, path, device, country) ' +
            'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)',
        )
        .bind(now, day, payload.event, visitorHash, dayHash, path, device, country),
    ]);
  } else {
    await env.DB
      .prepare(
        'INSERT INTO events (ts, day, type, visitor_hash, day_hash, path, device, country) ' +
          'VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7)',
      )
      .bind(now, day, payload.event, visitorHash, path, device, country)
      .run();
  }

  return json({ recorded: true }, 202, headers);
}

async function getPeriodStats(db, from, to) {
  return db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM events
         WHERE type = 'page_view' AND day BETWEEN ?1 AND ?2) AS pageViews,
        (SELECT COUNT(DISTINCT day_hash) FROM events
         WHERE type = 'page_view' AND day BETWEEN ?1 AND ?2) AS visitors,
        (SELECT COUNT(DISTINCT e.visitor_hash) FROM events e
         JOIN visitors v ON v.visitor_hash = e.visitor_hash
         WHERE e.type = 'page_view' AND e.day BETWEEN ?1 AND ?2
           AND v.first_seen BETWEEN ?1 AND ?2) AS newVisitors,
        (SELECT COUNT(DISTINCT e.visitor_hash) FROM events e
         JOIN visitors v ON v.visitor_hash = e.visitor_hash
         WHERE e.type = 'page_view' AND e.day BETWEEN ?1 AND ?2
           AND v.first_seen < ?1) AS returningVisitors
      `,
    )
    .bind(from, to)
    .first();
}

async function getDashboardStats(db, retentionDays) {
  const today = dayInSouthAfrica();
  const retentionStart = shiftDay(today, -(retentionDays - 1));
  const weekStart = mondayOf(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const dailyFrom = shiftDay(today, -29);

  const [overview, todayStats, weekStats, monthStats, clickRows, dailyRows, deviceRows, countryRows, recentRows] =
    await Promise.all([
      db
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM visitors) AS totalVisitors,
            (SELECT COUNT(*) FROM events WHERE type = 'page_view') AS pageViews`,
        )
        .first(),
      getPeriodStats(db, today, today),
      getPeriodStats(db, weekStart, today),
      getPeriodStats(db, monthStart, today),
      db
        .prepare(
          `SELECT type, COUNT(*) AS clicks
           FROM events
           WHERE day >= ?1 AND type IN ('whatsapp_click','phone_click','email_click','facebook_click')
           GROUP BY type`,
        )
        .bind(retentionStart)
        .all(),
      db
        .prepare(
          `SELECT day,
            SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) AS pageViews,
            COUNT(DISTINCT day_hash) AS visitors,
            SUM(CASE WHEN type = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsappClicks,
            SUM(CASE WHEN type = 'phone_click' THEN 1 ELSE 0 END) AS phoneClicks,
            SUM(CASE WHEN type = 'email_click' THEN 1 ELSE 0 END) AS emailClicks,
            SUM(CASE WHEN type = 'facebook_click' THEN 1 ELSE 0 END) AS facebookClicks
           FROM events
           WHERE day BETWEEN ?1 AND ?2
           GROUP BY day
           ORDER BY day`,
        )
        .bind(dailyFrom, today)
        .all(),
      db
        .prepare(
          `SELECT device, COUNT(*) AS pageViews
           FROM events
           WHERE type = 'page_view' AND day BETWEEN ?1 AND ?2
           GROUP BY device`,
        )
        .bind(dailyFrom, today)
        .all(),
      db
        .prepare(
          `SELECT country, COUNT(*) AS pageViews, COUNT(DISTINCT day_hash) AS visitors
           FROM events
           WHERE type = 'page_view' AND country IS NOT NULL AND day BETWEEN ?1 AND ?2
           GROUP BY country
           ORDER BY visitors DESC, pageViews DESC
           LIMIT 12`,
        )
        .bind(dailyFrom, today)
        .all(),
      db
        .prepare(
          `SELECT day, COUNT(*) AS events
           FROM events
           WHERE day BETWEEN ?1 AND ?2
           GROUP BY day
           ORDER BY day DESC
           LIMIT 7`,
        )
        .bind(shiftDay(today, -6), today)
        .all(),
    ]);

  const clicks = Object.fromEntries(
    ['whatsapp_click', 'phone_click', 'email_click', 'facebook_click'].map((type) => [
      type.replace('_click', ''),
      0,
    ]),
  );
  for (const row of clickRows.results) clicks[row.type.replace('_click', '')] = row.clicks;

  const dailyByDate = new Map(dailyRows.results.map((row) => [row.day, row]));
  const daily = Array.from({ length: 30 }, (_, index) => {
    const day = shiftDay(dailyFrom, index);
    const row = dailyByDate.get(day);
    return {
      date: day,
      visitors: row?.visitors ?? 0,
      pageViews: row?.pageViews ?? 0,
      whatsappClicks: row?.whatsappClicks ?? 0,
      phoneClicks: row?.phoneClicks ?? 0,
      emailClicks: row?.emailClicks ?? 0,
      facebookClicks: row?.facebookClicks ?? 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    retentionDays,
    overview,
    periods: { today: todayStats, week: weekStats, month: monthStats },
    clicks,
    daily,
    devices: deviceRows.results,
    countries: countryRows.results,
    recentActivity: recentRows.results,
  };
}

async function adminHtmlResponse(request, env) {
  const response = await env.ASSETS.fetch(new Request(new URL('/admin', request.url), request));
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health') return json({ ok: true });
      if (url.pathname === '/api/collect') return collectEvent(request, env);
      if (url.pathname === '/api/auth/login') {
        if (request.method !== 'POST') return error('Method not allowed', 405);
        return handleLogin(request, env);
      }
      if (url.pathname === '/api/auth/logout') {
        if (request.method !== 'POST') return error('Method not allowed', 405);
        if (!sameOriginPost(request)) return error('Request origin not allowed', 403);
        return json({ authenticated: false }, 200, { 'Set-Cookie': clearCookie() });
      }
      if (url.pathname === '/api/admin/session' || url.pathname.startsWith('/api/admin/')) {
        if (!secretsConfigured(env)) return error('Admin service is not configured', 503);
        if (!(await adminAuthorized(request, env))) return error('Authentication required', 401);
        if (url.pathname === '/api/admin/session' && request.method === 'GET') {
          return json({ authenticated: true });
        }
        if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
          const retentionDays = Math.max(
            30,
            Math.min(Number.parseInt(env.RETENTION_DAYS || DEFAULT_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS, 400),
          );
          return json(await getDashboardStats(env.DB, retentionDays));
        }
        return error('Not found', 404);
      }
      if (url.pathname === '/admin' || url.pathname === '/admin/') {
        return adminHtmlResponse(request, env);
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error('Request failed', {
        path: url.pathname,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return error('The request could not be completed', 500);
    }
  },

  async scheduled(_controller, env, ctx) {
    if (!env.DB) return;
    const retentionDays = Math.max(
      30,
      Math.min(Number.parseInt(env.RETENTION_DAYS || DEFAULT_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS, 400),
    );
    const cutoff = shiftDay(dayInSouthAfrica(), -(retentionDays - 1));
    ctx.waitUntil(
      Promise.all([
        env.DB.prepare('DELETE FROM events WHERE day < ?1').bind(cutoff).run(),
        env.DB.prepare('DELETE FROM visitors WHERE last_seen < ?1').bind(cutoff).run(),
        env.DB.prepare('DELETE FROM analytics_limits WHERE expires_at < ?1').bind(Date.now()).run(),
        purgeAttempts(env.DB),
      ]),
    );
  },
};
