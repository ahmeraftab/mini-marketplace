# Larch Market

A small multi-vendor marketplace, built as a working slice. One seller lists a configurable divan bed; a buyer picks a colour, size, storage, headboard and base with a **live price**, adds it to a basket, completes a demo checkout; the seller moves the order through New → Confirmed → Shipped → Delivered; an admin approves or hides shops and listings. The same site installs on a phone as a PWA, so web and app share one backend.

Everything here is sample data. Checkout takes no payment.

- **Live site:** _add the Vercel URL here_
- **Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Supabase (Postgres, Auth, Storage, Realtime, row-level security), deployed on Vercel.

## Test logins (sample accounts)

| Role | Email | Password |
|---|---|---|
| Buyer | demo.buyer@example.com | `Demo-Pass-2026!` |
| Seller | demo.seller@example.com | `Demo-Pass-2026!` |
| Admin | demo.admin@example.com | `Demo-Pass-2026!` |

The login page has buttons that fill these in. Anyone can use them, so `npm run seed:reset` restores the demo state.

## Run it locally

```bash
npm install
cp .env.example .env.local      # fill in the values (see below)
npm run db:push                 # applies supabase/migrations to your database
npm run seed:demo               # three demo accounts + the Prague bed
npm run dev                     # http://localhost:3000
```

Requires Node 20+ (Node 22 recommended).

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser | publishable (anon) key; safe because RLS is on everywhere |
| `SUPABASE_SECRET_KEY` | server only | service-role key, used for checkout and seeding |
| `SUPABASE_DB_URL` | your machine only | session-pooler connection string for `db:push`; never set on Vercel |
| `GEMINI_API_KEY` | server only | optional; enables "Describe with AI" |
| `GEMINI_MODEL` | server only | optional; default `gemini-3.5-flash-lite` (older names such as `gemini-2.5-flash` are no longer served to new keys) |
| `NEXT_PUBLIC_SITE_URL` | browser | canonical URL |

Keys live only in environment variables. `.env*` files (except `.env.example`) are git-ignored.

The demo sends no emails: sign-up creates the account already confirmed (on the server, with the service key) and signs the person straight in, so it works whatever the project's "Confirm email" setting is.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | static checks |
| `npm test` | 52 unit tests (pricing, money, cart keys, seller form) |
| `npm run test:db` | 46 database tests: the real migrations run on an in-process Postgres with a role shim |
| `npm run test:e2e` | Playwright against the built-in preview data: price table, swatches, tap sizes, no sideways scroll, gallery swipe, at 1280px, 360px and iPhone Safari (WebKit; `npx playwright install webkit` once) |
| live tests | against a seeded project: `FLOW_BASE_URL=http://localhost:3000 npx playwright test flow seller-form a11y` runs the whole buyer → seller → admin flow (also at 360px), a new seller building a listing through the real form, the live "status changed" message, and an accessibility scan (axe). All temporary data is called `TEST` and removed. |
| PWA test | `npm run build && npx next start -p 3200`, then `PWA_BASE_URL=http://localhost:3200 npx playwright test pwa --project=desktop` (manifest, icons, service worker, offline page) |
| `npm run db:push` | apply migrations |
| `npm run seed:base` / `seed:demo` / `seed:reset` | demo data |
| `npm run verify:rls` | signs in as each role against the real database and checks what each may do |
| `npm run photos:build` / `icons:build` | render the per-colour demo photo sets / the PWA icons (`images:build` is the drawn-illustration fallback) |

## How it works

### Prices (one function)

`src/lib/pricing.ts` → `priceConfiguration()` is the only place prices are calculated. The product page calls it on every click; the checkout server action calls it again on data it has just read from the database, so a tampered browser cannot change what is charged. All money is **integer pence**.

Following the price table literally, every size adds its listed amount to the £269.99 base (Small Single = £359.99). The page opens at £269.99 with no size chosen. This is seller-entered data, so changing it needs no code.

### Database

Migrations in `supabase/migrations/`:

- Tables: `profiles`, `sellers`, `categories`, `products`, `product_colours`, `product_images`, `option_groups`, `option_values`, `product_addons`, `orders`, `order_items` (snapshots of every option and price), `order_status_events`, `ai_usage`.
- **Options are data**: the buyer page renders whatever option groups the seller entered. Nothing is hard-coded.
- **Row-level security on every table.** Clients have read-only table access; every write goes through a named SQL function (`save_product`, `delete_product`, `set_order_status`, `admin_set_*`, and `create_orders`, which only the server's service role may call).
- A listing is public only when the listing **and** its shop are approved.
- Checkout is idempotent (`checkout_id`), so a double tap cannot create two orders.

### Roles

Buyer, seller, admin. Sign-up can only produce buyer or seller; the admin exists only through the seed. Admin pages and seller pages show an access-denied panel for the wrong role, and the database refuses the action regardless.

### AI feature

"Describe with AI" in the seller form: pick an uploaded photo and Gemini suggests a title, description and alt text. Nothing is applied until the seller presses a button. It is rate-limited per user in the database. Only sample photos should go through it: the free Gemini tier may use submitted content to improve Google's products.

### Mobile app

The PWA is the same site: manifest, icons, a small service worker (caches only static files and the offline page), install prompt on Android and Add-to-Home-Screen steps on iPhone. See `/install` and `docs/INSTALL_PWA.md`.

## Done and not done

Done: seller sign-up, listing form with photos, colours and options; buyer browse, search, filters, product page, basket, demo checkout, orders; seller order status changes with a realtime "status changed" message for the buyer; admin approve/hide; AI describe; installable PWA.

Not done, on purpose: real payments, emails (including confirmation and password reset), delivery tracking, analytics, reviews, stock levels, delivery charges and VAT, coupons, wishlists, sorting, web push, dark mode, a native app. See `docs/STATUS.md`.

## Image credits

The demo bed pictures are cropped and recoloured from two free Unsplash photos (Unsplash License, no attribution required; credited here anyway), one set of five per colour, built by `scripts/build-seed-photos.ts`:

- Clay Banks: https://unsplash.com/photos/1757418254008-1647eb0afe04
- mark champs: https://unsplash.com/photos/1566665797739-1674de7a421a

Only the upholstery is recoloured (hand-marked areas per photo, light and stitching kept), so the swatch changes the bed while the room stays as photographed; it is a demo grade, not the real fabric. To use your own photos, put them in `seed-assets/override/<colour-slug>/1.jpg … 5.jpg` and run `npm run seed:reset`. `scripts/build-seed-images.ts` remains as a drawn-illustration fallback.
