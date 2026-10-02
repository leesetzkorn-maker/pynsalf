-- PS PynSalf private analytics
--
-- PRIVACY: this schema stores no direct identifying information.
--   * no IP addresses (only an HMAC of an IP, used solely for login rate limiting,
--     and it expires - see login_attempts below)
--   * no names, emails, phone numbers, addresses or message contents
--   * the visitor key is pseudonymous, not fully anonymous: the client sends a
--     random local id and the Worker stores only HMAC(salt, id) plus a rotating
--     per-day HMAC. It is not linked to names or contact details.
--   * only a 2-letter country code from Cloudflare's edge, never a city or region

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           INTEGER NOT NULL,          -- event time, epoch milliseconds
  day          TEXT    NOT NULL,          -- YYYY-MM-DD in Africa/Johannesburg (UTC+2)
  type         TEXT    NOT NULL,          -- page_view | whatsapp_click | phone_click | email_click | facebook_click
  visitor_hash TEXT,                      -- stable pseudonymous visitor id (HMAC)
  day_hash     TEXT,                      -- rotating per-day id, used for unique-visitor counts
  path         TEXT,                      -- page path only, never a query string
  device       TEXT,                      -- mobile | tablet | desktop
  country      TEXT                       -- ISO 3166-1 alpha-2, or NULL
);

CREATE INDEX IF NOT EXISTS idx_events_day     ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_type    ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts);

-- Anonymous, stable HMAC visitor keys support new/returning counts. The
-- originating random browser ID is never stored by the service.
CREATE TABLE IF NOT EXISTS visitors (
  visitor_hash TEXT PRIMARY KEY,
  first_seen   TEXT NOT NULL,
  last_seen    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen);

-- Short-lived per-IP event throttles. Only a minute-scoped HMAC is persisted.
CREATE TABLE IF NOT EXISTS analytics_limits (
  bucket_hash  TEXT    PRIMARY KEY,
  hits         INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_limits_expires ON analytics_limits(expires_at);

-- Login throttling only. Stores an HMAC of the IP (never the address itself),
-- and is purged automatically so it cannot become a location history.
CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash      TEXT    PRIMARY KEY,
  fails        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);