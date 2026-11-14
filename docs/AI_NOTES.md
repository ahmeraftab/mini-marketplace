# AI notes

## Tools and what they were used for

- **Claude (Anthropic)** in the terminal: planned the project from the written brief, then wrote most of the code: SQL migrations, row-level security policies, the pricing function, the Next.js pages and components, tests and docs. The plan was written first with a larger model; implementation was done with a smaller one.
- **Google Gemini** inside the product: the "Describe with AI" feature in the seller form (title, description and alt text from a photo).

I read, ran and checked everything the AI produced; the tests and screenshots below are how mistakes were caught.

## Things the AI got wrong, and how they were fixed

1. **Could not read the reference page.** The retailer's site blocks automated tools (HTTP 429), so the AI could not see the real swatch names or look. It used public search listings for six colour names and flagged the hex values as estimates instead of inventing certainty. These must be checked by hand against the reference page.
2. **Chose a test runner that does not run here.** The plan used Vitest; it is incompatible with Node 20.16 on this machine. Caught when the first test run failed. Replaced with Node's built-in `node:test` through `tsx`, which also needed explicit file lists because Node 20 does not expand globs.
3. **The product page broke at 360px.** The first version of the gallery let the carousel widen its grid cell, so the page was wider than the phone. Mobile browsers then widened the layout viewport, which pushed the fixed "Add to Basket" bar off the bottom of the screen. Found by taking a 360px screenshot and by a Playwright click that could not reach the button. Fixed with `min-w-0` on the grid columns and by moving the thumbnail strip below the image on phones.
4. **Seller pages crashed for signed-out visitors.** The AI assumed the layout's login guard ran before the page. In Next.js a layout and its page render in parallel, so the page read `session!.id` on a null session. Caught by the end-to-end test "guests are sent to log in" (an error in the dev-server log). The first fix would have created a redirect loop for signed-in buyers visiting `/seller`; the final helper `requireSeller()` returns null for non-sellers instead.
5. **Test data mistake.** A unit test used a base price of £1,299 with a compare-at price of £539.98, which the validator correctly rejected. The test, not the code, was wrong.
6. **Stale dev server.** After new files were added, the dev server kept serving old modules and a screenshot showed the login page instead of the seller form. The cause was an old server still holding the port; restarting it fixed it.

## How the AI feature was checked

Server-side validation of the model's JSON with zod, a 20-second timeout, a database-backed rate limit of 10 calls per 10 minutes per user, friendly messages on failure, and "Use" buttons so nothing overwrites the seller's text silently.
