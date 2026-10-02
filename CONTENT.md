# PS PynSalf — content notes

The site is live at https://leesetzkorn-maker.github.io/pynsalf/
Every push to `main` republishes automatically via GitHub Actions.

## Brand

- Business / product name: **PS PynSalf** ("PS" = PynSalf)
- Logo mark: `assets/logo-mark.svg` (also used as the favicon artwork, see `assets/favicon.svg`)
- Jar artwork: `assets/product-pynsalf.svg` — labelled PS / PYNSALF / Natural Ingredients

## Still needed from the product owner

Nothing is blocking the site. These are the details to add when you have them:

| What | Where it goes | Current wording |
|---|---|---|
| Real product photo | hero | `assets/product-pynsalf.svg` jar artwork |
| Ingredients | About the Ointment | "Full ingredient and product information coming soon." |
| Price | About the Ointment | "Full product information coming soon." |
| Directions from the label | How To Use | "Directions will be added from the product label." |
| **Facebook page URL** | Contact section | avatar image only, no link yet |
| Business / trading hours | Contact section | not shown |

## Facebook

`assets/facebook-avatar.jpg` is the supplied profile photo, resized to 200x200.
The Contact section shows it next to "Find us on Facebook", but it is **not a link**
because the real page URL is unknown. To make it clickable, add an `href` in
`index.html` on the `.contact-fb` span:

```html
<a class="contact-fb" href="https://facebook.com/your-page" target="_blank" rel="noopener">
```

## How to replace the product photo

Save your photo into `assets/` and update this one line in `index.html`:

```html
<img src="assets/product-pynsalf.svg" ...>
```

It is cropped to a 4:5 portrait ratio automatically. A vertical photo works best.

## Customer photos

Originals stay on your computer and are excluded from the live site by `.gitignore`:

- `before.jpg` / `after.jpg` → published as `assets/before-1.webp`, `assets/after-1.webp`
- `before 2.jpg` / `after 2.jpg` → published as `assets/before-2.webp`, `assets/after-2.webp`
- `review.jpg` → published as `assets/review.webp`

The WebP copies are 84–95% smaller and the originals are never modified. To re-export
after a change, resize to 760px wide (860px for the review) and save as WebP.

## Wording

The copy stays deliberately careful: "soothing", "topical care", "designed for",
"everyday aches and discomfort". No cure claims, no certifications, no invented
testimonials or ratings. The customer's review appears as their own screenshot,
unedited. Add stronger wording only when you can support it.

## Run locally

No build step and no dependencies. Open `index.html`, or:

```bash
npx serve .
```

## Contact details

- WhatsApp: https://wa.me/27723973400 (shown as 072 397 3400)
  Prefilled message: "Hi, I'd like to know more about PS PynSalf."
- Phone: tel:+27723973400
- Email: Gustavsetzkorn99@fmail.com