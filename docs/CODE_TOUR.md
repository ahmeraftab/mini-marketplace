# Code tour

## Where things live

| Thing | File |
|---|---|
| **Price rules** | `src/lib/pricing.ts` (tests: `tests/unit/pricing.test.ts`) |
| Money in pence | `src/lib/money.ts` |
| Basket line identity | `src/lib/cart/key.ts`, store in `src/lib/cart/store.ts` |
| Product page | `src/components/product/configurator.tsx` |
| Checkout (server) | `src/lib/orders/actions.ts` → `placeOrder`, `src/lib/orders/resolve.ts` |
| Seller form | `src/components/seller/product-form.tsx`, state in `src/lib/seller/form-state.ts` |
| Database | `supabase/migrations/*.sql` |
| Demo data | `scripts/seed.ts`, `src/lib/demo/prague.ts` |
| Access checks | `scripts/verify-rls.ts` |

## Life of an order

1. The product page calls `priceConfiguration()` on each click and shows the total.
2. **Add to Basket** stores identifiers (product, colour, one value per group, add-ons, quantity) plus a display snapshot in the browser. A different combination has a different key, so it is a separate line.
3. The basket page asks the server to re-read every line (`refreshBasket`), so removed or repriced items are flagged.
4. **Place order** calls `placeOrder`: verify the signed-in buyer → re-read products (row-level security hides anything not public) → validate each selection → price with `priceConfiguration()` → compare with the displayed total → call `create_orders` with the service role.
5. `create_orders` writes one order per seller with item snapshots and a first status event, in one transaction. The same `checkout_id` returns the same orders.
6. The seller changes status with `set_order_status`; the buyer's browser receives the Realtime update and shows a message.

## Drill 1: add a storage option (no code)

Seller hub → edit the Prague bed → Options → Storage → **Add a choice** → name and extra cost → **Save changes**. The buyer page shows it immediately because options are rows, not code.

## Drill 2: change a price rule (one edit plus its test)

Example: "Professional Assembly is free for King and Super King."

1. Open `src/lib/pricing.ts`. In the loop over `selection.addonIds`, skip the add-on's price when the chosen Size value label is `King 5FT` or `Super King 6FT`.
2. Add a case to `tests/unit/pricing.test.ts` and run `npm test`.

Checkout uses the same function, so the browser and the server cannot disagree.
