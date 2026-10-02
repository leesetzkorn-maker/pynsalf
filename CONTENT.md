# Content Checklist

Everything below is marked in `index.html` with an orange dashed outline.
Search the HTML for `[` to find them all.

## Brand

| Placeholder | Where |
|---|---|
| `[PRODUCT NAME]` | Header logo, hero eyebrow, footer, page title, OG title |
| `[PRODUCT IMAGE]` | Hero image — replace `assets/product-placeholder.svg` |

## Product information

| Placeholder | Where |
|---|---|
| `[ADD PRODUCT DESCRIPTION HERE]` | About Our Ointment |
| `[INGREDIENTS]` | Product details table |
| `[PRICE]` | Product details table |
| `[WARNINGS]` | Product details table |
| `[ADD CORRECT DIRECTIONS FOR USE]` | How To Use, step 1 |

## Business information

| Placeholder | Where |
|---|---|
| `[ADD FATHER/BUSINESS STORY HERE]` | Made With Care |
| `[ADD BUSINESS HOURS]` | Contact section |

## How to replace the photo

1. Save your photo into `assets/` (e.g. `assets/product.jpg`).
   Keep it under about 300 KB. WebP is best.
2. In `index.html`, change this line:

   ```html
   <img src="assets/product-placeholder.svg" ... >
   ```

   to:

   ```html
   <img src="assets/product.jpg" ... >
   ```

The photo is cropped to a 4:5 portrait ratio automatically, so a vertical
photo works best.

## Health-claims notice

The wording on the site is deliberately cautious: "soothing", "topical care",
"designed for", "may help provide temporary relief". No cure claims, no
medical certifications, and no testimonials have been added, because none
were supplied.

If you add stronger wording later, only use claims you can actually support.

## Testimonials

There is no testimonials section yet, on purpose. No real reviews were
supplied, so none were invented. When you have genuine customer reviews,
add a `<section id="testimonials">` block and link it in the nav.

## Run it

No build step and no dependencies. Open `index.html` directly, or serve it:

```bash
npx serve .
```

## Contact details used

- WhatsApp: https://wa.me/27723973400 (displayed as 072 397 3400)
- Phone: tel:+27723973400
- Email: Gustavsetzkorn99@fmail.com