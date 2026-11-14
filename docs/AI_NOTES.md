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

7. **The AI button was dead and nobody noticed.** The Gemini model name copied from another project (`gemini-2.5-flash`) is no longer served to new keys (HTTP 404), and the form just said "unavailable". Found when the real key was tried for the first time; fixed by listing the models the key can use and switching to `gemini-3.5-flash-lite`. The friendly failure message worked as designed, which is why it was silent.
8. **The "order status changed" message never arrived.** The code looked right and the database was configured, but the browser's realtime socket subscribed before it carried the signed-in person's token, so it ran as the anonymous role and the server refused it ("invalid column for filter buyer_id"). Found by making the end-to-end test wait for the message, then reading the socket frames. Fixed by setting the token before subscribing.
9. **Sign-up depended on a dashboard setting.** With "Confirm email" on, sign-up hit the built-in mailer's rate limit and failed. Sign-up now creates a confirmed account on the server. A related bug: the sign-up form's default `next=/` sent new sellers to the home page instead of their hub.
10. **The first "per colour" photos tinted the whole room.** The AI's grade washed walls and linen too, and Cream still looked grey. Replaced with hand-marked upholstery areas per photo, checked on a contact sheet of every colour; the first masks spilled onto a pillow and the rug and were tightened after looking at each image.
11. **Two test mistakes, not app bugs.** A deleted photo still returned 200 from the CDN cache (the test now asks the database), and a "£199.50" text match hit a hidden filter hint on phones.

## How the AI feature was checked

Server-side validation of the model's JSON with zod, a 20-second timeout, a database-backed rate limit of 10 calls per 10 minutes per user, friendly messages on failure, and "Use" buttons so nothing overwrites the seller's text silently.
