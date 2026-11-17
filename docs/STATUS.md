# Status

## Complete

- Seller: sign-up, shop approval banner, listing form (photos with resize and upload, colours with their own titles, option groups with extra prices, extras), save draft, submit for approval, edit, delete, incoming orders with status changes.
- Buyer: browse, search, filters (category, colour, size, price), product page with gallery, lightbox, swatches, live price, sticky mobile bar, basket (each configuration is its own line), demo checkout, orders with a status timeline, realtime "status changed" message.
- Admin: approve or hide shops and listings.
- AI: "Describe with AI" in the seller form.
- PWA: manifest, icons, service worker, offline page, install guide.
- Security: row-level security on every table, write-only-through-functions, server-side price recomputation at checkout, idempotent orders.
- Tests: 52 unit, 46 database, `verify:rls` (20 checks against the live project), Playwright: price table, swatches, tap sizes, gallery swipe and no sideways scroll at 1280px, 360px and iPhone Safari; the full buyer → seller → admin flow at 1280px and 360px; a new seller signing up and building a listing through the real form; the live order-status message; accessibility scan (axe) of every main page; PWA checks on a production build.
- Lighthouse (mobile, product page, production build on a laptop): accessibility 100, best practices 100, performance 47 to 61 (the page is dominated by hydration work; the first photo is preloaded). To be re-measured on Vercel.

## Simplified or incomplete

- The basket lives on the device (localStorage). It is not synced between devices.
- Demo photos are real Unsplash photos (credited in the README) cropped into five views and colour-graded per swatch, so the colour change is approximate, not the true fabric.
- A new listing needs admin approval before buyers see it (assumed; see the plan's questions).
- Photos of a deleted listing are removed with it; photos a seller removes while editing a listing stay in storage (no clean-up job).
- Sign-up creates confirmed accounts without email checks (there are no emails in the demo), so a real launch needs email confirmation and rate limiting added.
- Not tested on real phones yet.
- No content security policy header.

## With two more weeks

1. Server-synced basket and saved addresses.
2. Real payments (Stripe test mode) and order emails.
3. Stock levels, delivery charges and VAT.
4. A full end-to-end flow test across all three roles.
5. Reviews, sorting and seller dashboards with sales numbers.
6. Web push for order updates.
