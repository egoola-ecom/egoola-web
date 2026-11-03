# Buyer cart and wishlist: browser test results

Run against the local backend (`localhost:8000`) and `next dev` (`localhost:3000`) with a fresh buyer.
Brief: `egoola-server/docs/prompt/buyer/frontend-buyer-cart-wishlist-prompt.md`.

| # | Case | Result |
|---|---|---|
| 1 | Product from seller A, then seller B | Pass: two carts, each seller lookup shows only its line |
| 2 | Gig from a seller who also has a product in the cart | Pass: separate `service` cart, lines never mix |
| 3 | Same SKU twice (2 then 3) | Pass: one line, qty 5 |
| 4 | `GET` with no `seller` | Pass: the most recently touched cart only |
| 5 | `PATCH qty 1` after 5 | Pass: exactly 1 (replace) |
| 6 | `PATCH qty` on a gig line | Pass: 400, shown as a message |
| 7 | Deactivate a SKU in the cart | Pass: line stays, `available:false`, shown flagged (struck through, warning), not hidden |
| 8 | Clear a cart | Pass: lines gone, cart still returned with `items: []` |
| 9 | Missing `?type=` | Pass: 400 (the screen always sends it) |
| 10 | Save twice | Pass: 201 then 200 with the same id |
| 11 | Un-save something never saved | Pass: 204, no error |
| 12 | Favourite, seller made inactive | Pass: drops out of the list, comes back when the seller is active again |
| 13 | Wishlist `type=service` vs none | Pass: filtered vs mixed, newest first |
| 14 | Add a listing that is not visible | Pass: 400 `{listing: [...]}` |
| 15 | `GET /buyer/cart/summary/` after adding to two sellers and a gig | Pass: one row per cart, newest first, grand `item_count` is the line count (4 for 1 + 2 + 1); an empty buyer gets `{item_count: 0, carts: []}` |

Screens checked as well: cart page is guarded and returns to the cart after login; header badge shows the grand `item_count` of the summary (a line count, all sellers and both types); quantity
stepper sends absolute values; server stock error shown (999 > stock); services tab; per-seller URL
(`/buyer/cart?type=product&seller=550`); empty states "no cart" (`null`) vs "cart is empty" are different; add to
cart from product detail (needs every option picked) and gig detail (package radio); heart painted from saved ids and
removes on click; wishlist tabs and a page past the last one shows "There are no more favourites to show" with a way back to page 1; no page errors.

## Backend notes
- `GET /buyer/cart/` with no matching cart returns 200 with an **empty body**, not JSON `null` as the guide says.
  The client treats both as "no cart".

## All carts (summary)
- The header badge is the summary's grand `item_count`, from one call. Clicking Cart opens a dropdown with one row per
  cart (seller, type, item count, subtotal), newest first, each linking to that cart, and a "View all carts" button.
- `/buyer/cart` with no `type` opens the most recently touched cart of any type (the default cart) and lists every cart
  above it with the open one marked. With `?type=&seller=` it opens that cart. Signed out: no badge, and the dropdown
  says there are no carts.
- The badge and the list refresh after an add, remove, change or clear.
