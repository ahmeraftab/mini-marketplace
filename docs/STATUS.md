# Status

## Complete

- Seller: sign-up, shop approval banner, listing form (photos with resize and upload, colours with their own titles, option groups with extra prices, extras), save draft, submit for approval, edit, delete, incoming orders with status changes.
- Buyer: browse, search, filters (category, colour, size, price), product page with gallery, lightbox, swatches, live price, sticky mobile bar, basket (each configuration is its own line), demo checkout, orders with a status timeline, realtime "status changed" message.
- Admin: approve or hide shops and listings.
- AI: "Describe with AI" in the seller form.
- PWA: manifest, icons, service worker, offline page, install guide.
- Security: row-level security on every table, write-only-through-functions, server-side price recomputation at checkout, idempotent orders.
- Tests: 52 unit, 46 database, Playwright for the product page and mobile layout.

## Simplified or incomplete

- The basket lives on the device (localStorage). It is not synced between devices.
- Demo photos are real Unsplash photos (credited in the README) cropped into six views and colour-graded per swatch, so the colour change is approximate, not the true fabric.
- A new listing needs admin approval before buyers see it (assumed; see the plan's questions).
- Photos of deleted listings stay in storage; a clean-up job is not written.
- The full buyer → seller → admin flow test (`tests/e2e/flow.spec.ts`) is not written; `npm run verify:rls` and manual testing cover it.
- Not tested on real phones yet.
- No content security policy header.

## With two more weeks

1. Server-synced basket and saved addresses.
2. Real payments (Stripe test mode) and order emails.
3. Stock levels, delivery charges and VAT.
4. A full end-to-end flow test across all three roles.
5. Reviews, sorting and seller dashboards with sales numbers.
6. Web push for order updates.
