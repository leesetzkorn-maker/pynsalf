#!/usr/bin/env node
/**
 * check-site.js - static QA gate for the PS PynSalf site.
 *
 * Runs with Node built-ins only (no npm packages) so it works locally and in
 * the GitHub Actions deploy workflow before anything is published.
 *
 * Usage:  node scripts/check-site.js
 * Exit code 0 = all checks passed, 1 = at least one check failed.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://pynsalf.co.za';
const OLD_SITE = 'leesetzkorn-maker.github.io/pynsalf';
const WA_NUMBER = '27665703425';
const WA_TEXT = 'Hi Gus, I found PS PynSalf online and would like to know more or place an order for a 350ml jar.';
const WA_URL_PREFIX = 'https://wa.me/' + WA_NUMBER + '?text=';
const TEL = 'tel:+27665703425';
const MAILTO = 'mailto:pynsalf00@gmail.com';
const FACEBOOK = 'https://www.facebook.com/share/19V2pz8Tyz/';

const failures = [];
const passes = [];

function pass(msg) { passes.push(msg); }
function fail(msg) { failures.push(msg); }
function check(ok, msg) { if (ok) pass(msg); else fail(msg); }

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/** Every attr="value" occurrence for a given attribute name in an HTML string. */
function attrs(html, name) {
  const re = new RegExp(name + '\\s*=\\s*"([^"]*)"', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Strip HTML comments so placeholder text inside them is not treated as content. */
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/** Visible text of an anchor: inner HTML minus tags, with entities decoded. */
function anchorText(anchorHtml) {
  return anchorHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectAnchors(html) {
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrsRaw = m[1];
    const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrsRaw);
    out.push({
      open: m[0],
      href: hrefMatch ? hrefMatch[1] : '',
      text: anchorText(m[2]),
      rawAttrs: attrsRaw,
    });
  }
  return out;
}

function collectImgs(html) {
  const re = /<img\b([^>]*)>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function hrefTargetExists(href) {
  // strip query/hash for local files
  const clean = href.split('#')[0].split('?')[0];
  if (clean === '' || clean.startsWith('#') || clean.startsWith('http') ||
      clean.startsWith('tel:') || clean.startsWith('mailto:') || clean.startsWith('data:')) {
    return true;
  }
  const rel = clean.replace(/^\.\//, '');
  return exists(rel);
}

// --------------------------------------------------------------------------
// Load pages
// --------------------------------------------------------------------------

const indexHtml = read('index.html');
const privacyHtml = read('privacy.html');
const indexVisible = stripComments(indexHtml);
const privacyVisible = stripComments(privacyHtml);
const css = read('css/style.css');
const mainJs = read('js/main.js');
const analyticsJs = read('js/analytics.js');
const deployYml = read('.github/workflows/deploy.yml');

// --------------------------------------------------------------------------
// 1. Required files
// --------------------------------------------------------------------------

[
  'index.html', 'privacy.html', 'robots.txt', 'sitemap.xml', 'CNAME',
  'css/style.css', 'admin/index.html',
  'assets/logo-mark.svg', 'assets/favicon.svg', 'assets/product-pynsalf.svg',
  'assets/hero-waterfall.png',
  'assets/og-image.png', 'assets/apple-touch-icon.png', 'assets/facebook-avatar.jpg',
  'assets/before-1.webp', 'assets/after-1.webp',
  'assets/before-2.webp', 'assets/after-2.webp', 'assets/review.webp',
  'assets/before-1-380w.webp', 'assets/after-1-380w.webp',
  'assets/before-2-380w.webp', 'assets/after-2-380w.webp', 'assets/review-430w.webp',
  '.github/workflows/deploy.yml',
].forEach((rel) => check(exists(rel), 'required file exists: ' + rel));

['js/main.js', 'js/admin-config.js', 'js/analytics.js'].forEach((rel) => {
  check(exists(rel), 'required file exists: ' + rel);
});

// --------------------------------------------------------------------------
// 2. Head metadata consistency
// --------------------------------------------------------------------------

const titleMatch = /<title>([^<]*)<\/title>/i.exec(indexHtml);
const title = titleMatch ? titleMatch[1].trim() : '';
check(!!titleMatch, 'index.html has a <title>');
check(/PS PynSalf/i.test(title), 'title names PS PynSalf: "' + title + '"');
check(/topical/i.test(title) && /body care/i.test(title) && /350ml/i.test(title) && /South Africa/i.test(title),
  'title contains required terms (PS PynSalf, topical, body care, 350ml, South Africa)');
check(title.length >= 20 && title.length <= 75,
  'title length ' + title.length + ' within 20-75 characters');

const metaDesc = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(indexHtml);
const description = metaDesc ? metaDesc[1].trim() : '';
check(!!metaDesc, 'index.html has a meta description');
check(description.length >= 70 && description.length <= 170,
  'description length ' + description.length + ' within 70-170 characters');
check(/PS PynSalf/i.test(description) && /topical/i.test(description) &&
      /350ml/i.test(description) && /South Africa/i.test(description),
  'description contains required terms');

function metaContent(tag) {
  const re = new RegExp('<meta\\s+(?:name|property)="' + tag + '"\\s+content="([^"]*)"', 'i');
  const m = re.exec(indexHtml);
  return m ? m[1] : '';
}

const ogTitle = metaContent('og:title');
const ogDesc = metaContent('og:description');
const ogUrl = metaContent('og:url');
const ogImage = metaContent('og:image');
const twTitle = metaContent('twitter:title');
const twDesc = metaContent('twitter:description');

check(ogTitle === title, 'og:title matches <title>');
check(twTitle === title, 'twitter:title matches <title>');
check(ogDesc === description, 'og:description matches meta description');
check(twDesc === description, 'twitter:description matches meta description');
check(ogUrl === SITE + '/', 'og:url is ' + SITE + '/');
check(ogImage === SITE + '/assets/og-image.png', 'og:image points at assets/og-image.png on the live domain');
check(/\.(png|jpe?g)$/i.test(ogImage), 'og:image is a raster file (Facebook/WhatsApp ignore SVG)');
check(exists('assets/og-image.png'), 'og:image file exists on disk');

// --------------------------------------------------------------------------
// 3. Canonical URLs, robots, sitemap, CNAME
// --------------------------------------------------------------------------

const indexCanonical = (/<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(indexHtml) || [])[1];
const privacyCanonical = (/<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(privacyHtml) || [])[1];
check(indexCanonical === SITE + '/', 'index.html canonical is ' + SITE + '/');
check(privacyCanonical === SITE + '/privacy.html', 'privacy.html canonical is ' + SITE + '/privacy.html');

const robots = read('robots.txt');
check(robots.indexOf('Sitemap: ' + SITE + '/sitemap.xml') !== -1,
  'robots.txt Sitemap line uses ' + SITE);
check(robots.indexOf(OLD_SITE) === -1, 'robots.txt has no old github.io URL');

const sitemap = read('sitemap.xml');
const locMatches = sitemap.match(/<loc>([^<]*)<\/loc>/g) || [];
const locs = locMatches.map((l) => l.replace(/<\/?loc>/g, ''));
check(locs.length >= 2, 'sitemap.xml lists ' + locs.length + ' URLs');
locs.forEach((loc) => {
  check(loc.startsWith(SITE + '/'), 'sitemap loc uses live domain: ' + loc);
  check(loc.indexOf(OLD_SITE) === -1, 'sitemap loc has no old github.io URL: ' + loc);
});
locs.forEach((loc) => {
  const rel = loc.replace(SITE + '/', '').replace(/^$/, 'index.html');
  check(exists(rel), 'sitemap URL resolves to a real file: ' + loc + ' -> ' + rel);
});
check(sitemap.indexOf('<lastmod>') !== -1, 'sitemap.xml has lastmod values');

const cname = read('CNAME').trim();
check(cname === 'pynsalf.co.za', 'CNAME file contains pynsalf.co.za (got "' + cname + '")');
check(OLD_SITE === '' || !indexVisible.includes(OLD_SITE),
  'index.html has no old github.io URL');
check(!privacyVisible.includes(OLD_SITE), 'privacy.html has no old github.io URL');
check(!sitemap.includes(OLD_SITE), 'sitemap.xml has no old github.io URL');

// --------------------------------------------------------------------------
// 4. deploy.yml stages what the site actually needs
// --------------------------------------------------------------------------

[
  'index.html', 'privacy.html', 'robots.txt', 'sitemap.xml', 'CNAME',
  'css/style.css', 'js/*.js', 'admin/index.html', 'assets/',
].forEach((needle) => {
  check(deployYml.indexOf(needle) !== -1, 'deploy.yml stages ' + needle);
});
check(/node scripts\/check-site\.js/.test(deployYml),
  'deploy.yml runs scripts/check-site.js before publishing');

// --------------------------------------------------------------------------
// 5. Structure: one h1, landmarks, nav, skip link
// --------------------------------------------------------------------------

const h1s = indexVisible.match(/<h1\b[^>]*>/gi) || [];
check(h1s.length === 1, 'index.html has exactly one <h1> (found ' + h1s.length + ')');
check(/PS PynSalf/.test(indexVisible) && /hero-title/.test(indexVisible),
  'hero h1 id="hero-title" is present');
check(/<main id="main">/.test(indexHtml), 'index.html has <main id="main">');
check(/class="skip-link"/.test(indexHtml), 'index.html has a skip link');
check(/<header class="site-header">/.test(indexHtml), 'index.html has a site header');
check(/<footer class="site-footer">/.test(indexHtml), 'index.html has a site footer');
check(/<nav class="primary-nav" id="primary-nav"/.test(indexHtml), 'primary nav present with id');
check(/aria-controls="primary-nav"/.test(indexHtml), 'nav toggle references primary-nav');
check(/id="proof"/.test(indexHtml) && /id="benefits"/.test(indexHtml) &&
      /id="about"/.test(indexHtml) && /id="ingredients"/.test(indexHtml) &&
      /id="how-to-use"/.test(indexHtml) && /id="reviews"/.test(indexHtml) &&
      /id="guarantee"/.test(indexHtml) && /id="skin-body-care"/.test(indexHtml) &&
      /id="body-care"/.test(indexHtml) && /id="maker"/.test(indexHtml) &&
      /id="contact"/.test(indexHtml),
  'all planned section ids are present');

// --------------------------------------------------------------------------
// 6. Internal links and in-page anchors
// --------------------------------------------------------------------------

const ids = new Set();
(function collectIds() {
  const re = /\sid="([^"]+)"/gi;
  let m;
  while ((m = re.exec(indexHtml)) !== null) ids.add(m[1]);
})();

const indexAnchors = collectAnchors(indexHtml);
const privacyAnchors = collectAnchors(privacyHtml);

let anchorOk = true;
indexAnchors.forEach((a) => {
  if (a.href.startsWith('#')) {
    const target = decodeURIComponent(a.href.slice(1));
    if (!ids.has(target)) {
      anchorOk = false;
      fail('index.html anchor target missing: ' + a.href);
    }
  } else if (a.href && !hrefTargetExists(a.href)) {
    anchorOk = false;
    fail('index.html href target missing on disk: ' + a.href);
  }
});
if (anchorOk) pass('all index.html anchors and local hrefs resolve');

let privacyOk = true;
privacyAnchors.forEach((a) => {
  if (a.href && !hrefTargetExists(a.href)) {
    privacyOk = false;
    fail('privacy.html href target missing on disk: ' + a.href);
  }
});
if (privacyOk) pass('all privacy.html hrefs resolve');
check(ids.has('main'), 'id="main" exists for the skip link');
const sectionIds = Array.from(indexVisible.matchAll(/<section\b[^>]*\bid="([^"]+)"/gi), (m) => m[1]);
check(sectionIds[0] === 'top' && sectionIds[1] === 'reviews',
  'customer Before & After section is directly below the hero');

// --------------------------------------------------------------------------
// 7. Images: attributes, alt text, srcset and on-disk paths
// --------------------------------------------------------------------------

let imgOk = true;
const imgRe = /<img\b[^>]*>/gi;
let imgMatch;
const imgList = [];
while ((imgMatch = imgRe.exec(indexHtml)) !== null) imgList.push(imgMatch[0]);

imgList.forEach((tag) => {
  const alt = /alt="([^"]*)"/i.exec(tag);
  if (!alt) { imgOk = false; fail('img without alt attribute: ' + tag.slice(0, 90)); return; }
  const src = /src="([^"]*)"/i.exec(tag);
  if (src && !src[1].startsWith('data:') && !exists(src[1])) {
    imgOk = false; fail('img src missing on disk: ' + src[1]);
  }
  const srcset = /srcset="([^"]*)"/i.exec(tag);
  if (srcset) {
    srcset[1].split(',').forEach((part) => {
      const file = part.trim().split(/\s+/)[0];
      if (file && !file.startsWith('data:') && !exists(file)) {
        imgOk = false; fail('srcset file missing on disk: ' + file);
      }
    });
  }
  // customer photos must keep intrinsic size attributes (no forced crops)
  if (/assets\/(before|after|review)/.test(src ? src[1] : '')) {
    if (!/width="/i.test(tag) || !/height="/i.test(tag)) {
      imgOk = false; fail('customer photo missing width/height: ' + tag.slice(0, 90));
    }
    if (/object-fit|style="/i.test(tag)) {
      imgOk = false; fail('customer photo must not carry style/object-fit: ' + tag.slice(0, 90));
    }
  }
});
if (imgOk) pass('all index.html <img> tags have alt text and existing files');

check(/assets\/hero-waterfall\.png/.test(indexHtml), 'hero uses assets/hero-waterfall.png');
check(/assets\/apple-touch-icon\.png/.test(indexHtml), 'apple-touch-icon is referenced');
check(/rel="preload"\s+as="image"\s+href="assets\/hero-waterfall\.png"/.test(indexHtml) ||
      /as="image"[^>]*href="assets\/hero-waterfall\.png"/.test(indexHtml),
  'hero image is preloaded');

// Preload must match the actual <img src> so the browser doesn't fetch a
// different asset than the one that renders.
const heroImgSrc = (/<img[^>]+src="([^"]+)"/.exec(indexHtml.slice(indexHtml.indexOf('class="hero"'))) || [])[1];
const preloadHref = (/<link[^>]+rel="preload"[^>]+href="([^"]+)"/.exec(indexHtml) ||
                      /<link[^>]+href="([^"]+)"[^>]+rel="preload"/.exec(indexHtml) || [])[1];
check(!!heroImgSrc && heroImgSrc === preloadHref,
  'preload href matches hero img src (img=' + heroImgSrc + ', preload=' + preloadHref + ')');
check(/hero\.webp|hero-1080w\.webp|hero-760w\.webp|<picture>/.test(indexHtml) === false,
  'baked-text hero webp artwork is no longer referenced');
check(/hero-art|hero-shop-link|hero-a11y|coming-soon|product-facts|trust-strip|cart-link/.test(css) === false,
  'style.css no longer contains removed component rules');
check(/\.wa-fab\s*\{[^}]*display:\s*none/.test(css) === false,
  'floating WhatsApp button is not display:none in CSS');

// --------------------------------------------------------------------------
// 8. Contact + WhatsApp consistency (analytics.js depends on exact hrefs)
// --------------------------------------------------------------------------

const waAnchors = indexAnchors.filter((a) => a.href.startsWith('https://wa.me/'));
check(waAnchors.length >= 6, 'index.html has ' + waAnchors.length + ' WhatsApp links (want >= 6)');
let waOk = true;
waAnchors.forEach((a) => {
  const expected = WA_URL_PREFIX + encodeURIComponent(WA_TEXT);
  if (a.href !== expected) {
    waOk = false;
    fail('WhatsApp href is not the canonical message: ' + a.href);
  }
  if (!/target="_blank"/.test(a.open) || !/rel="noopener noreferrer"/.test(a.open)) {
    waOk = false;
    fail('WhatsApp link missing target=_blank rel=noopener noreferrer: ' + a.href);
  }
  if (!/whatsapp/i.test(a.text) && !/whatsapp/i.test((/aria-label="([^"]*)"/i.exec(a.open) || [])[1] || '')) {
    waOk = false;
    fail('WhatsApp link has no WhatsApp label: ' + a.href);
  }
});
if (waOk && waAnchors.length) pass('all WhatsApp links use the canonical message + safe rel attributes');

const orderLabels = waAnchors.filter((a) => /order on whatsapp/i.test(a.text)).length;
check(orderLabels >= 5, 'at least 5 WhatsApp CTAs are labelled "Order on WhatsApp" (found ' + orderLabels + ')');

check(indexVisible.includes(TEL), 'tel:+27665703425 link present');
indexAnchors.concat(privacyAnchors).forEach((anchor) => {
  if (anchor.href.startsWith('tel:')) {
    check(anchor.href === TEL, 'telephone link uses the canonical number: ' + anchor.href);
  }
  if (anchor.href.startsWith('https://wa.me/')) {
    const url = new URL(anchor.href.replace(/&amp;/g, '&'));
    check(url.pathname === '/' + WA_NUMBER, 'WhatsApp link uses the canonical number');
    check(!!url.searchParams.get('text'), 'WhatsApp link preserves a pre-filled message');
  }
});
check(indexVisible.includes('066 570 3425'), 'display number 066 570 3425 present');
check(!/072[ -]?397[ -]?3400|27723973400/.test(indexVisible),
  'no old contact number remains in index.html');
check(indexVisible.includes(MAILTO), 'mailto:pynsalf00@gmail.com link present');
const fbAnchors = indexAnchors.filter((a) => a.href === FACEBOOK);
check(fbAnchors.length >= 2, 'Facebook page link used at least twice (found ' + fbAnchors.length + ')');
check(indexVisible.indexOf('https://www.facebook.com/share/') === indexVisible.lastIndexOf('https://www.facebook.com/share/') ||
      indexAnchors.filter((a) => a.href.startsWith('https://www.facebook.com/share/') && a.href !== FACEBOOK).length === 0,
  'no stray Facebook URLs (analytics.js matches the exact address)');

// analytics.js selectors must still match real hrefs on the page
check(analyticsJs.indexOf('a[href^="https://wa.me/27665703425"]') !== -1 &&
      analyticsJs.indexOf('a[href^="tel:+27665703425"]') !== -1 &&
      analyticsJs.indexOf('a[href^="mailto:pynsalf00@gmail.com"]') !== -1 &&
      analyticsJs.indexOf('a[href="https://www.facebook.com/share/19V2pz8Tyz/"]') !== -1,
  'analytics.js selectors still match the live link formats');
check(/tel:\+27665703425/.test(analyticsJs) && /27665703425/.test(analyticsJs),
  'analytics.js still instruments the SA number');
check(!/072[ -]?397[ -]?3400|27723973400/.test(analyticsJs),
  'analytics.js has no old contact number');
check(/ps_analytics_opt_out/.test(analyticsJs) && /ps_analytics_opt_out/.test(privacyHtml) &&
      /id="toggle"/.test(privacyHtml),
  'privacy opt-out is intact (localStorage key + toggle button)');
check(/pynsalf-private-analytics\.lee-setzkorn\.workers\.dev/.test(read('js/admin-config.js')),
  'admin-config.js points at the private analytics worker');

// --------------------------------------------------------------------------
// 9. Wording rules
// --------------------------------------------------------------------------

const bannedPhrases = [
  'the area you are treating',
  'aches and discomfort',
  'stiff or sore',
  'topical ointment',
  'beauty cream',
  'skin & beauty',
  'skin and beauty cream',
  'coming soon',
  'lorem ipsum',
  'lorem',
  'placeholder text',
  'xxx todo',
];
const lower = indexVisible.toLowerCase();
bannedPhrases.forEach((phrase) => {
  check(lower.indexOf(phrase) === -1, 'banned phrase absent: "' + phrase + '"');
});

// medical-claim verbs must never appear outside an explicit negation
const claimRe = /\b(cures?|treats?|heals?|prevents?)\b/gi;
const sentences = indexVisible.replace(/<[^>]*>/g, ' ').split(/(?<=[.!?])\s+/);
let claimFails = 0;
sentences.forEach((s) => {
  claimRe.lastIndex = 0;
  if (claimRe.test(s) && !/\bnot\b|\bno\b|\bnever\b|\bwithout\b|\bdisclaimer\b|\bdon'?t\b|\bdo not\b|\bisn'?t\b/i.test(s)) {
    claimFails++;
    fail('affirmative medical-claim wording: "' + s.trim().slice(0, 140) + '"');
  }
});
if (claimFails === 0) pass('no affirmative cure/treat/heal/prevent claims outside negations');

check(/not a medicine/i.test(indexVisible), '"not a medicine" disclaimer present');
check(/body care product/i.test(indexVisible), '"body care product" wording present');
check(/apply to the desired area of the skin/i.test(indexVisible),
  'conservative application wording present');
check(/not a substitute for medical advice/i.test(indexVisible) ||
      /not a substitute for advice/i.test(indexVisible),
  'medical-advice disclaimer present');
check(/within south africa only/i.test(indexVisible), 'South Africa delivery scope stated');
check(/not medical results/i.test(indexVisible), 'guarantee scope sentence present');
check(/I stand behind every 350ml jar I fill by hand/i.test(indexVisible),
  'owner guarantee wording present');
check(/August 2018/.test(indexVisible) && /5000|5,000/.test(indexVisible),
  'trading date and client count present');
check(/7 jars have been returned for a refund|only 7 jars/i.test(indexVisible),
  'refund count present');
check(/hand-filled in small batches|filled by hand/i.test(indexVisible), 'small-batch wording present');
check(/not a medicine/i.test(indexVisible) && /not a medicine/i.test(indexVisible.split('guarantee-scope')[1] || ''),
  'guarantee block repeats the not-a-medicine scope');

// --------------------------------------------------------------------------
// 10. JSON-LD structured data
// --------------------------------------------------------------------------

const ldMatches = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
check(ldMatches.length === 1, 'exactly one JSON-LD block (found ' + ldMatches.length + ')');
let ld = null;
if (ldMatches.length) {
  const body = ldMatches[0].replace(/<\/?script[^>]*>/gi, '').trim();
  try {
    ld = JSON.parse(body);
    pass('JSON-LD parses as valid JSON');
  } catch (e) {
    fail('JSON-LD does not parse: ' + e.message);
  }
}

if (ld) {
  const graph = ld['@graph'] || [ld];
  const types = graph.map((n) => n['@type']).filter(Boolean);
  check(types.indexOf('WebSite') !== -1, 'JSON-LD has WebSite');
  check(types.indexOf('Organization') !== -1, 'JSON-LD has Organization');
  check(types.indexOf('Product') !== -1, 'JSON-LD has Product');

  const json = JSON.stringify(ld);
  ['offers', 'aggregateRating', 'review', 'price', 'priceCurrency'].forEach((key) => {
    check(new RegExp('"' + key + '"').test(json) === false,
      'JSON-LD has no fabricated "' + key + '" field');
  });

  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach((k) => {
      const v = node[k];
      if (typeof v === 'string' && v.indexOf(OLD_SITE) !== -1) {
        fail('JSON-LD contains old github.io URL: ' + v);
      }
      if (k === 'url' || k === '@id' || k === 'image' || k === 'logo') {
        if (typeof v === 'string' && v.indexOf(SITE) !== -1) pass('JSON-LD URL on live domain: ' + v);
        else if (typeof v === 'string' && v.startsWith('http') && v.indexOf(SITE) === -1) {
          fail('JSON-LD URL not on live domain: ' + v);
        }
      }
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') walk(v);
    });
  })(graph);

  const product = graph.find((n) => n['@type'] === 'Product');
  if (product) {
    check(/350ml/i.test(product.name || ''), 'Product name mentions 350ml');
    check(/PS PynSalf/.test(product.name || ''), 'Product name mentions PS PynSalf');
    check(/not a medicine/i.test(product.description || ''),
      'Product description carries the not-a-medicine scope');
  }
  const org = graph.find((n) => n['@type'] === 'Organization');
  if (org) {
    check(org.foundingDate === '2018-08', 'Organization foundingDate is 2018-08');
    check(/27665703425/.test(JSON.stringify(org.contactPoint || {})),
      'Organization contactPoint uses +27665703425');
  }
}

// --------------------------------------------------------------------------
// 11. Script / stylesheet hygiene
// --------------------------------------------------------------------------

const linkHrefs = attrs(indexHtml, 'href').filter((h) => /\.(css|js)(\?|$)/i.test(h));
linkHrefs.forEach((h) => {
  const file = h.split('?')[0].replace(/^\.\//, '');
  check(exists(file), 'referenced asset exists: ' + h);
});
check(indexVisible.indexOf('http://') === -1 || /xmlns=/.test(indexHtml),
  'no insecure http:// page references');

const scriptSrcs = attrs(indexHtml, 'src').filter((s) => /\.js(\?|$)/i.test(s));
check(scriptSrcs.indexOf('js/main.js') !== -1, 'main.js is loaded');
check(scriptSrcs.indexOf('js/admin-config.js') !== -1, 'admin-config.js is loaded');
check(scriptSrcs.indexOf('js/analytics.js') !== -1, 'analytics.js is loaded');
check(!/analytics\.js/.test(indexVisible) || /defer/.test(indexHtml), 'analytics is deferred on index');
check(mainJs.indexOf("matchMedia('(min-width: 1024px)')") !== -1,
  'main.js desktop breakpoint matches the CSS (1024px)');
check(css.indexOf('min-width: 1024px') !== -1, 'CSS defines the desktop nav breakpoint at 1024px');

// --------------------------------------------------------------------------
// 12. Report
// --------------------------------------------------------------------------

console.log('');
console.log('PS PynSalf site check');
console.log('---------------------');
console.log('Passed: ' + passes.length);
console.log('Failed: ' + failures.length);
console.log('');

if (failures.length) {
  console.log('FAILURES');
  failures.forEach((f) => console.log('  x ' + f));
  console.log('');
  process.exit(1);
}

console.log('All checks passed.');
console.log('');
