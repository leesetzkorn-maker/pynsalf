const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787';
const password = process.env.SMOKE_PASSWORD;
if (!password) throw new Error('Set SMOKE_PASSWORD to a local-only test password.');

const origin = new URL(base).origin;
const request = (path, init = {}) =>
  fetch(new URL(path, base), {
    ...init,
    headers: { Origin: origin, ...(init.headers || {}) },
  });
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const privateBeforeLogin = await request('/api/admin/stats');
assert(privateBeforeLogin.status === 401, 'Dashboard API exposed data before login.');

const wrongLogin = await request('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10' },
  body: JSON.stringify({ password: `${password}-wrong` }),
});
assert(wrongLogin.status === 401, 'An incorrect password was accepted.');

const login = await request('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10' },
  body: JSON.stringify({ password }),
});
assert(login.status === 200, `Correct local test password rejected (${login.status}).`);
const setCookie = login.headers.get('Set-Cookie');
assert(setCookie && /HttpOnly/.test(setCookie) && /SameSite=Strict/.test(setCookie), 'Session cookie is not protected.');
const cookie = setCookie.split(';', 1)[0];

const visitorId = 'smoke_test_visitor_000000000001';
const eventNames = ['page_view', 'whatsapp_click', 'phone_click', 'email_click', 'facebook_click'];
for (const event of eventNames) {
  const response = await request('/api/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '192.0.2.10' },
    body: JSON.stringify({ event, visitorId, path: '/pynsalf/' }),
  });
  assert(response.status === 202, `Could not record ${event} (${response.status}).`);
}

const statsResponse = await request('/api/admin/stats', { headers: { Cookie: cookie } });
assert(statsResponse.status === 200, 'Authenticated dashboard stats were not available.');
const stats = await statsResponse.json();
assert(stats.overview.totalVisitors === 1, 'Page view was not counted as one unique visitor.');
assert(stats.overview.pageViews === 1, 'Page view was not recorded.');
assert(stats.daily[stats.daily.length - 1].pageViews === 1, 'CTA clicks were included in page-view totals.');
assert(stats.clicks.whatsapp === 1, 'WhatsApp click was not recorded.');
assert(stats.clicks.phone === 1, 'Phone click was not recorded.');
assert(stats.clicks.email === 1, 'Email click was not recorded.');
assert(stats.clicks.facebook === 1, 'Facebook click was not recorded.');
assert(stats.daily.length === 30, 'Dashboard does not return at least 30 days.');

const logout = await request('/api/auth/logout', {
  method: 'POST',
  headers: { Cookie: cookie },
});
assert(logout.status === 200, 'Could not sign out.');
const privateAfterLogout = await request('/api/admin/stats');
assert(privateAfterLogout.status === 401, 'Dashboard API was available after sign-out.');

console.log('PASS: private dashboard, rejected wrong password, HttpOnly session,');
console.log('      page view, four CTA events, 30-day table and sign-out.');
