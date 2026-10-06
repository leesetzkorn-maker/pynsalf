# PS PynSalf — content notes

The site is live at https://pynsalf.co.za/
Every push to `main` republishes automatically via GitHub Actions.

`CNAME` pins the custom domain (`pynsalf.co.za`) for GitHub Pages; the workflow
stages it into the published artifact, so the domain survives every deploy.

## Search indexing

`sitemap.xml` lists the canonical homepage, its Open Graph image and the privacy
page, and is copied into the Pages artifact by `.github/workflows/deploy.yml`.
Update it when additional public pages are added. All URLs must use
`https://pynsalf.co.za/` — never the old `github.io` project address.

`robots.txt` allows crawling and names the sitemap at the live domain. With a
custom domain, that file is served from the domain root, so it does control
host-root crawling rules.

## QA gate

`scripts/check-site.js` is a dependency-free Node script that fails the deploy
if anything drifts. The workflow runs it on every push, before staging:

```bash
node scripts/check-site.js
```

It checks: required files; title/description/Open Graph consistency; canonical
URLs; robots/sitemap/CNAME agreement; internal anchors and on-disk asset paths;
image `alt`/`srcset`/`width`/`height` attributes; the single-`h1` rule; the
exact WhatsApp URL (number + prefill message + `noopener noreferrer`);
`tel:`/`mailto:`/Facebook hrefs matching `js/analytics.js` selectors; banned
phrases and affirmative medical-claim verbs outside negations; the pinned
guarantee wording; JSON-LD shape (WebSite + Organization + Product, and **no**
`offers` / `aggregateRating` / `review` / `price`); and that `deploy.yml`
stages everything the site needs.

## Brand

- Business / product name: **PS PynSalf** — a **350ml topical body-care cream**
- Never called: ointment, Skin & Beauty Cream, topical ointment, beauty cream,
  or a treatment/medicine
- Logo mark: `assets/logo-mark.svg` (also the favicon artwork, see
  `assets/favicon.svg`; `assets/apple-touch-icon.png` is generated from it)
- Hero artwork: `assets/hero-waterfall.png` (1672×941) — real product photo of the
  PS PynSalf 350ml jar beside a waterfall, used as a full-bleed hero background
  with a sand-coloured gradient behind the copy; the old `assets/hero*.webp` crops
  had "SHOP NOW" / "Skin & Beauty" baked into the pixels and are no longer
  referenced. `assets/product-pynsalf.svg` (clean jar illustration) is still used
  by the Facebook poster. `scripts/check-site.js` asserts the hero `<img>` and the
  `<link rel="preload">` point at the same file — update both together.
- Container: **350ml jar with a lid**, hand-filled in small batches, no squeeze tubes
- Trading since **August 2018** — a one-man show, every jar filled by hand
- Contact email: `pynsalf00@gmail.com`
- Delivery: **within South Africa only**

## Still needed from the product owner

Nothing is blocking the site. These are the details to add when you have them:

| What | Where it goes | Current wording |
|---|---|---|
| Verified ingredient list | Ingredients (`#ingredients`) | "The full list is on the label" + "Ask on WhatsApp" |
| Directions from the label | How To Use (`#how-to-use`) | Four safety points only; numbered `.step-list` styles are ready for the real steps |
| Price | About / Contact | not shown |
| Business / trading hours | Contact section | not shown |

When adding any of these, run `node scripts/check-site.js` afterwards — it
guards the wording rules.

## Facebook

`assets/facebook-avatar.jpg` is the supplied profile photo, resized to 200x200.
The Contact section links it to the supplied page URL, and there is also a
"View on Facebook" button:

```
https://www.facebook.com/share/19V2pz8Tyz/
```

Note this is a **share** link, which Facebook intends for sharing rather than as a
permanent homepage. If you ever get the page's own address
(`facebook.com/<page-name>`), swap it into **every** occurrence in `index.html`
(the `.contact-fb` anchor, the `.btn-fb` "View on Facebook" button, the
`.proof-community` link, the JSON-LD `sameAs`) **and** the selector
`a[href="https://www.facebook.com/share/19V2pz8Tyz/"]` in `js/analytics.js` —
the analytics script matches the exact URL string.

The button blue is `#166fe5`, not Facebook's `#1877f2`, because white text on the
standard brand blue only reaches 4.23:1 at this button's font size.

## Customer photos

Originals stay on your computer and are excluded from the live site by `.gitignore`:

- `before.jpg` / `after.jpg` → published as `assets/before-1.webp`, `assets/after-1.webp`
- `before 2.jpg` / `after 2.jpg` → published as `assets/before-2.webp`, `assets/after-2.webp`
- `review.jpg` → published as `assets/review.webp`

Each photo is also published at a second, smaller size so phones do not download the
large file (for example `assets/before-1-380w.webp` alongside `assets/before-1.webp`).
The markup uses `srcset`, so the browser picks the right one automatically.

**The customer photos are never cropped, filtered or resized with a forced aspect
ratio.** Please keep it that way — they are real people sharing real results. The
Before/After frames deliberately use plain `width: 100%; height: auto`, keep the
intrinsic `width`/`height` attributes, and never carry `style` or `object-fit`
(`check-site.js` enforces this).

To re-export after a change, resize to 760px wide (860px for the review) and save as
WebP, then regenerate the smaller variants.

## Wording

The copy stays deliberately careful: "soothing", "topical care", "designed for",
"everyday body care". No cure claims, no certifications, no invented testimonials
or ratings. The customer's review appears as their own screenshot, unedited. Add
stronger wording only when you can support it.

The hero introduces **PS PynSalf** with the h1 "Everyday body care." and a lead
describing it as a **350ml body-care cream** with the customer community behind it
since August 2018. The product is described as a **350ml body-care cream** (or
**350ml topical body-care cream** in longer copy) throughout — never as an
ointment or a Skin & Beauty Cream.

The "Everyday Skin & Body Care, Written Plainly" section deliberately answers
search-shaped questions (dry skin, skin texture, ageing skin, appearance of fine
lines / stretch marks / cellulite) and then says plainly that none of it is a
medical claim. Appearance-type topics always use "the appearance of ..." — never a
statement that the product treats them. Keep the closing note that PS PynSalf is a
body care product and not a medicine.

Do not claim that PS PynSalf treats or cures cancer, stroke, Bell's palsy, or
other medical conditions without reliable product-specific clinical evidence and
appropriate regulatory authorisation. The site explicitly warns visitors not to
delay or replace medical care.

## Published on the owner's instruction

Added 2 Oct 2026 at the owner's explicit request, overriding the earlier advice to
suppress them. They are live:

- **Our 100% Money-Back Guarantee** with the owner's wording: every 350ml jar
  filled by hand, roughly 5000 clients to date, only 7 jars returned for a refund,
  money back if not satisfied, no hassle.
- The accompanying scope line: *"This guarantee is about your money, not medical
  results."* That sentence is the reason the guarantee is safe to publish — it ties
  the promise to the refund and explicitly disclaims any outcome claim. **Do not
  remove it.**

Both are pinned by `scripts/check-site.js`, so they cannot be reworded by accident.

The customer-proof strip above the fold repeats the same four figures (Aug 2018,
±5,000 clients, 7 refunds, 100% guarantee) as **business history**, explicitly not
as product claims. Keep that framing.

### Deliberately not published

These are still excluded. Do not add them without confirming they can be honoured:

| Claim | Why it is not on the site |
|---|---|
| "to demonstrate what is possible with regular use" | Turned the before/after photos into an implied efficacy promise. |
| "POPIA Compliant" | Formal compliance assertion. Only publish once the business is actually compliant. |
| "trusted by the community / proof in the pudding" | Unverifiable praise. |
| Ingredients, price, directions from the label | Not supplied yet — see the table above. |

The consent wording for the customer photos *is* published, because the photos were
already live and the owner supplied that wording. Keep it accurate: if consent for
any photo is withdrawn, take that photo down.

## Run locally

No build step and no dependencies. Open `index.html`, or:

```bash
npx serve .
```

## Testing

Static checks first (this is what the deploy workflow runs):

```bash
node scripts/check-site.js
```

Then check the site at 360px, 390px, 430px, 768px, 1024px, 1440px
and 1920px wide:

- no sideways scrolling
- the four customer photos and the review screenshot show in full, uncropped
- the menu opens and closes on a phone; the static desktop nav appears from 1024px up
- the WhatsApp, phone and email buttons all work
- the floating WhatsApp button stays visible on a phone and never sits on top of text

## Contact details

- WhatsApp: https://wa.me/27665703425 (shown as 066 570 3425)
  Prefilled message (the one `check-site.js` pins):
  "Hi Gus, I found PS PynSalf online and would like to know more or place an order
  for a 350ml jar."
  Every WhatsApp CTA on the site carries this exact message, and the visible label
  is **"Order on WhatsApp"** (the Ingredients card uses "Ask on WhatsApp").
- Phone: tel:+27665703425 — international format, so it dials correctly anywhere
- Display number: 066 570 3425
- Email: pynsalf00@gmail.com
- Facebook: https://www.facebook.com/share/19V2pz8Tyz/

`js/analytics.js` instruments these exact href prefixes:

```
a[href^="https://wa.me/27665703425"]   -> whatsapp_click
a[href^="tel:+27665703425"]            -> phone_click
a[href^="mailto:pynsalf00@gmail.com"] -> email_click
a[href="https://www.facebook.com/share/19V2pz8Tyz/"] -> facebook_click
```

If the number ever changes again, update all of these together — `check-site.js`
fails the deploy if any WhatsApp/telephone href, the JSON-LD `contactPoint` or an
analytics selector drifts from the pinned values.

## SEO metadata

`index.html` carries the canonical URL, meta description, Open Graph tags, Twitter
card and JSON-LD. Two rules protect it from drift:

- `<title>`, `og:title` and `twitter:title` must stay identical, and `og:description`
  must match the meta description. The static checker fails if they diverge.
- The title/description wording is **the owner's to curate**. The checker asserts
  length and required terms (brand, "topical", "body care", "South Africa",
  "350ml") rather than an exact string, so re-wording them is safe.

`og:image` points at `assets/og-image.png` — a 1200x630 PNG, not the SVG, because
Facebook and WhatsApp do not render SVG previews. The checker enforces `.png` and
that the file exists. Regenerate it with the `ogimage.js` script kept outside the
repo if the jar artwork or wording changes.

`assets/apple-touch-icon.png` is generated from `assets/logo-mark.svg` (see the
temporary `make-icon.js` recipe if it ever needs regenerating: sharp, 180x180,
flattened onto the brand green `#1f4d3d`, because Apple touch icons ignore
transparency).

The JSON-LD `@graph` contains `WebSite`, `Organization` (foundingDate 2018-08,
phone +27665703425, Facebook in `sameAs`) and `Product`. It deliberately contains
**no** `offers`, `aggregateRating`, `review` or price, because no price, ratings or
address have been confirmed. That means no rich product result in Google — that is
the honest trade-off, and adding those fields without real data would be a
fabricated structured-data claim.

## Privacy & analytics

`privacy.html` is the opt-out page: it explains what the analytics worker records
(page views and WhatsApp/phone/email/Facebook clicks, by date, broad device type
and country), that only a keyed HMAC of the browser identifier is stored, and it
lets the visitor flip `ps_analytics_opt_out` in this browser. `js/analytics.js` and
`js/admin-config.js` implement that design; do not change the localStorage key
without updating both the script and the privacy page.
