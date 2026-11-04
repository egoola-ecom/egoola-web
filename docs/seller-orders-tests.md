# Seller orders: browser test results

Brief: `egoola-server/docs/prompt/seller/seller-app-flutter-orders-prompt.md`. The brief is named for the Flutter seller app because the same seller features exist in the app and on the website. This record covers the seller website in `egoola-web`. Run with `next dev` on port 3000 and the Django backend on port 8000, using real Chrome driven by Playwright.

## Test data

The seeded seller (`0100000002`) is unverified, so it cannot operate. Instead the test makes two fresh sellers through the admin API (verified and active), gives each an approved product with stock, and has a buyer place orders through the real checkout API. Orders are moved along with the seller API, and the buyer cancels through the buyer API. Nothing was written to the database directly.

## How the order flow shapes the screens

- The seller moves an order one step at a time: `pending` to `accepted` or `rejected`, then `in_progress`, `shipped`, `delivered`. The detail page offers only the moves that are valid from the current status. A finished order (`rejected`, `cancelled`, `delivered`) offers none.
- Rejecting needs a reason that the buyer sees. The dialog keeps its button disabled until a reason is typed (spaces alone do not count).
- Marking an order delivered also turns a Cash on Delivery payment from Due to Paid, with a new row in the payment history. The seller does nothing extra.
- A move answers with the full order. The page replaces its whole copy with the answer.
- The buyer can cancel until the seller ships, so a seller's page can be out of date. A refused move shows the server's message and reloads the order.

## What was built

- `src/lib/seller-order-api.ts`: `listSellerOrders` (cursor), `getSellerOrder`, `moveSellerOrder`, and `nextMoves`, which says which moves each status allows.
- `src/app/(seller)/seller/orders/`: the list (`orders-client.tsx`), the detail (`[id]/order-detail-client.tsx`), the badges (`order-status.tsx`), and a layout that locks the section for a seller who cannot operate.
- An **Orders** tab in the seller navigation, after Jobs. It is hidden for a seller who cannot operate.
- `OperateGate` takes a `name`, so the locked page says "Orders are locked" instead of "Jobs are locked". Jobs and Bids look as before apart from small wording changes in the locked text.
- The list reuses the cursor-list hook and the "Load more" footer of the job board.

Screens:

- **List:** order number and date, buyer name and phone, status badge, payment badge, amount to collect. Search (buyer name, phone, email), a status filter, a placed-from and placed-to date, Clear filters, and a Refresh button (the web version of pull-to-refresh).
- **Detail:** buyer card, items table with the money lines, delivery address (with place names), payment card with its own history, order history newest first, and the move buttons. A note under the title says where the order stands.
- **Badges:** pending amber, accepted and in progress blue, shipped grey, delivered green, rejected and cancelled red. Payment: due amber, paid green.

## Results for the 9 cases in the brief

| # | Case | Result |
|---|---|---|
| 1 | List orders, filter by pending | Pass. With 23 orders (19 pending), the page shows 20 and "Load more" brings the rest. Filtering to pending shows exactly 19, all Pending. Delivered shows 1. Search by buyer name, a search with no match, a date range in the future, and Refresh also work |
| 2 | Open one, check buyer, items, address and payment | Pass. Buyer name and phone, the item and its money, the address with "Smoke Addr Thana, Feni, Chittagong, Bangladesh", Cash on Delivery with status Due and one history row, one order history row. Only Accept and Reject are offered |
| 3 | Accept it | Pass. One PATCH with only `{"status":"accepted"}`. The badge turns Accepted and the history gets a second row. Start preparing is now offered |
| 4 | Try to jump to delivered | Pass. The screen never offers Delivered or Shipped from Accepted. The API answers 400 "Cannot move an order from accepted to delivered." A stale page (the buyer cancelled in the meantime) shows "Cannot move an order from cancelled to in_progress." and reloads to Cancelled with no buttons |
| 5 | In progress, shipped, delivered | Pass. Each step works. The payment stays Due until delivered, then shows Paid with two payment history rows. The order history has 5 rows and no move is offered |
| 6 | Reject with no reason | Pass. The dialog's button is disabled for an empty reason and for spaces only. The API answers 400 `{"reason": ["A reason is required to reject an order."]}` |
| 7 | Reject with a reason | Pass. The status turns Rejected, "Rejected: Cannot supply this item" is shown, and the history row carries the reason |
| 8 | Act on a rejected order | Pass. No buttons. The API answers 400 "Cannot move an order from rejected to accepted." |
| 9 | An order placed with another seller | Pass. The page says "This order was not found." The API answers 404 for both read and move. A non-numeric id gives the not-found page |

## Extra checks

- Signed out: `/seller/orders` goes to the login page. The API answers 401 with no token.
- A seller who is not verified sees no Orders tab, and `/seller/orders` shows "Orders are locked".
- The seller sees the buyer's cancel reason ("Cancelled: Changed my mind").
- "Not now" in the dialog closes it without sending anything.
- No page errors in the console. `tsc` and `eslint` are clean.

## Not tested for real

- A seller who is paused (verified but inactive) or suspended. The gate is the one the Jobs pages use.
- A 403 that appears while the page is open, and a 401 after the session ends.
- Orders with a service or a duration line. Only product orders appear in this list.

## Notes for the backend

- The buyer fields on the list row include `wallet_balance`, which the seller screens do not need or show. It could be left out of what a seller sees.
- The brief's out-of-order message says "from accepted to delivered" with the raw status names, including `in_progress`. Words such as "In progress" would read better for a person.
- When the backend was found stopped at the start of this work, the Django server was started again with `uv run manage.py runserver 8000`. No server code was changed.
