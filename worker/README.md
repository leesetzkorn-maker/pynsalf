# Private PS PynSalf analytics

The public website remains on GitHub Pages. This Cloudflare Worker and D1 database provide the password-verified admin session and private analytics API; the public pages contain no credentials. The dashboard data API rejects unauthenticated requests. `SITE_ORIGIN` is the GitHub Pages origin, not the full page URL.

## Configure and deploy

1. Install the Worker tooling from this directory with `npm install`, then authenticate Wrangler with your own Cloudflare account using `npx wrangler login`.
2. Create the database: `npx wrangler d1 create pynsalf-analytics`. Copy the returned database ID into `database_id` in `wrangler.toml`; do not leave the all-zero placeholder.
3. Apply `schema.sql` to the remote database with `npm run schema:remote`.
4. Create an administrator password of at least 16 characters. Run `npm run hash` in an interactive terminal and enter it at the hidden prompt. The generator uses 100,000 PBKDF2-SHA256 iterations; Cloudflare Workers Web Crypto rejects the 310,000-iteration value used by many Node.js examples with `NotSupportedError`. Store the resulting PBKDF2 hash as a Worker secret with `npx wrangler secret put ADMIN_PASSWORD_HASH`. Never use the password itself as the hash or commit either value.
5. Generate two independent random values of at least 32 bytes, for example with `node -p "require('node:crypto').randomBytes(32).toString('base64')"`. Use `npx wrangler secret put SESSION_SECRET` and `npx wrangler secret put ANALYTICS_SALT` to save them as Worker secrets. Do not reuse either value for another secret.
6. Deploy with `npm run deploy`. The private dashboard is hosted at the Worker origin plus `/admin` (the origin will be shown by Wrangler after deploy).
7. Set that HTTPS Worker origin in `js/admin-config.js` as `window.PYNSALF_ANALYTICS_ORIGIN`. This origin is public configuration, not a secret. Commit and push the change to `main` so GitHub Pages publishes the analytics scripts and `/admin/` redirect. The Pages deploy workflow stages both.
8. Test the live Worker login and events before relying on the dashboard. Update `SITE_ORIGIN` in `wrangler.toml` if the public site host changes.

Do not paste passwords, hashes or secret values into chat, source files, or GitHub Actions logs. The Cloudflare account, D1 database ID, Worker secrets and public Worker origin must be configured by the site owner; this repository intentionally does not contain them.

## Local testing

Run `npm test` for the self-contained route and database checks (Node 22.13 or newer). For the full Workers runtime smoke test, create an ignored `worker/.dev.vars` file with local-only values for `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `ANALYTICS_SALT`, `ENVIRONMENT=development`, and `SITE_ORIGIN=http://127.0.0.1:8787`. Use a test-only password and secrets. Initialize local D1 with `npm run schema:local`, start `npm run dev`, and in another terminal set `SMOKE_PASSWORD` to the matching test password before running `npm run smoke`. The smoke script verifies rejected unauthenticated access, password rejection, login/logout, page views, all four CTA events, and 30 daily rows. Never reuse local test secrets in production.

## Data handling

The dashboard stores page-view and CTA event records, path (without query or fragment), broad device type, and an optional country code from Cloudflare. Visitor IDs and short-lived rate-limit keys are HMAC-protected; visitor IDs remain pseudonymous and should not be described as fully anonymous. Raw IP addresses, names, contact details and message contents are not written to D1. Records are retained for up to 400 days. `privacy.html` discloses the browser identifier and provides a browser-level analytics opt-out.
