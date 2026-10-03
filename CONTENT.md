# PS PynSalf — content notes

The site is live at https://leesetzkorn-maker.github.io/pynsalf/
Every push to `main` republishes automatically via GitHub Actions.

## Search indexing

`sitemap.xml` lists the canonical homepage and its Open Graph image and is copied
into the Pages artifact by `.github/workflows/deploy.yml`. Update it when
additional public pages are added.
The repository's `robots.txt` allows crawling and names the sitemap. It is
published at `/pynsalf/robots.txt`. Because this is a GitHub Pages project site,
that file cannot control host-root robots rules; Google's host-root
`robots.txt` currently returns 404, which does not block crawling. Host-level
rules would need to be managed on the GitHub Pages domain root or a custom domain.

## Brand

- Business / product name: **PS PynSalf** ("PS" = PynSalf, stated explicitly on the page)
- Logo mark: `assets/logo-mark.svg` (also used as the favicon artwork, see `assets/favicon.svg`)
- Product jar photo: `1000254640.png` — PS Skin & Beauty Cream, 350 ml
- Hero artwork: `assets/hero*.webp` — responsive, full-bleed crops from the supplied homepage reference
- Container: **350ml jar with a lid**, handmade in small batches, no squeeze tubes
- Trading since **August 2018** — a one-man show, every jar filled by hand
- Contact email: `gustavsetzkorn99@gmail.com`

## Still needed from the product owner

Nothing is blocking the site. These are the details to add when you have them:

| What | Where it goes | Current wording |
|---|---|---|
| Product photo | hero artwork | Included in the supplied `heropage.png` design |
| Ingredients | About the Ointment | "Full ingredient and product information coming soon." |
| Price | About the Ointment | "Full product information coming soon." |
| Directions from the label | How To Use | "Directions will be added from the product label." |
| Business / trading hours | Contact section | not shown |

## Facebook

`assets/facebook-avatar.jpg` is the supplied profile photo, resized to 200x200.
The Contact section links it to the supplied page URL, and there is also a
"View on Facebook" button:

```
https://www.facebook.com/share/19V2pz8Tyz/
```

Note this is a **share** link, which Facebook intends for sharing rather than as a
permanent homepage. If you ever get the page's own address
(`facebook.com/<page-name>`), swap it into both places in `index.html`:

- the `.contact-fb` anchor in the contact list
- the `.btn-fb` "View on Facebook" button

The button blue is `#166fe5`, not Facebook's `#1877f2`, because white text on the
standard brand blue only reaches 4.23:1 at this button's font size.

## How to replace the product photo

The hero is currently the supplied, responsive design artwork. To replace it,
export matching desktop and phone crops in WebP format, then update the
`<picture>` sources and `srcset` in `index.html`. Keep an accessible heading,
description and keyboard-reachable order link in `.hero-a11y`.

The current art exports are pixel-matched crops of the supplied reference:
1536×611 for desktop and 930×607 for phones. Their intrinsic proportions are
preserved by the responsive `<picture>`; replace all matching `srcset` variants
together so each screen size continues to load the right image.

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
Before/After frames deliberately use plain `width: 100%; height: auto`.

To re-export after a change, resize to 760px wide (860px for the review) and save as
WebP, then regenerate the smaller variants.

## Wording

The copy stays deliberately careful: "soothing", "topical care", "designed for",
"everyday aches and discomfort". No cure claims, no certifications, no invented
testimonials or ratings. The customer's review appears as their own screenshot,
unedited. Add stronger wording only when you can support it.

The hero introduces **PS Skin & Beauty Cream**, with PS PynSalf retained as the
business name. The separate topical body-care and medical-safety information
remains in the About and product-information sections.

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

Both are pinned verbatim by the static checker, so they cannot be reworded by
accident.

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

There is no test runner in the repo, to keep it dependency-free. Before publishing, check the site at 360px, 390px, 430px, 768px, 1024px, 1440px
and 1920px wide:

- no sideways scrolling
- the four customer photos and the review screenshot show in full, uncropped
- the menu opens and closes on a phone
- the WhatsApp, phone and email buttons all work
- the floating WhatsApp button does not sit on top of any text

## Contact details

- WhatsApp: https://wa.me/27723973400 (shown as 072 397 3400)
  Prefilled message: "Hi, I'd like to know more about PS PynSalf."
- Phone: tel:0723973400 — local format, so it dials correctly on a South African handset
- Email: gustavsetzkorn99@gmail.com

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

The JSON-LD `@graph` deliberately contains **no** `offers`, `aggregateRating`,
`review` or postal address, because no price, ratings or address have been
confirmed. That means no rich product result in Google — that is the honest
trade-off, and adding those fields without real data would be a fabricated
structured-data claim.