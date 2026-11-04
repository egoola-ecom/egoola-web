# Admin orders: browser test results

Brief: `egoola-server/docs/prompt/admin/frontend-admin-order-prompt.md`. Run with `next dev` on port 3000 and the Django backend on port 8000, using real Chrome driven by Playwright, signed in as the test admin.

## Test data

Each run makes two fresh sellers (with unique names) through the admin API, each with an approved product and stock. A buyer registers, saves an address and places orders through the real checkout API. The seller API accepts one order so the list has a mix of statuses. Nothing was written to the database directly. The Payment Gateways screen from the earlier brief was already built, so nothing extra was needed for it.

## What was built

- `src/lib/admin-orders-api.ts`: `listOrders` (cursor and filters), `getOrder`, `updateOrderStatus`. A blank reason is left out of the request.
- `src/app/(admin)/admin/(protected)/orders/`: the list (`orders-client.tsx`) and the detail (`[id]/order-detail-client.tsx`).
- An **Orders** entry in the admin menu, after Wishlists.
- `src/components/order-status.tsx`: the status badges, moved out of the seller screens so seller and admin share one palette. It now also lists all 9 statuses, in flow order. The seller screens import from it and look the same.

Screens:

- **List:** search (buyer name, phone, or seller name), a status filter, an order type filter, a buyer picker and a seller picker (typing a name, as on other admin forms), a created-from and created-to date range, Clear filters and Refresh. Columns: order and date, buyer, seller, status badge, payment badge, payable. The list is cursor paged with "Load more" and no total. A link such as `/admin/orders?seller=<id>` opens the list already narrowed to that seller (or `?buyer=`).
- **Detail:** a Change status card at the top, then people (buyer and seller, each with a link to all of their orders), items with the money lines, the delivery address with place names, the payment with its own history, the order history, and a Record card with the created and last-changed audit columns.
- **Change status:** a plain select with all 9 statuses (pending, accepted, in progress, shipped, delivered, rejected, cancelled, completed, disputed). Nothing is greyed out. A Reason box appears for rejected and cancelled and says a reason is optional but welcome. Apply status is disabled only when the chosen status equals the current one. A confirm box shows "Move order #N from A to B?", says when the payment will be marked paid, and says when no reason was given that this is allowed. The page then replaces its whole copy from the server's answer and shows "Order #N moved from A to B."

## Results for the 8 cases in the brief

| # | Case | Result |
|---|---|---|
| 1 | List with no filters | Pass. 20 rows, newest first, with buyer, seller, status badge, payment badge and payable. "Load more" adds rows |
| 2 | Filter by a specific seller | Pass. Chosen with the seller picker, the list shows exactly that seller's 4 orders and the API agrees. Adding a buyer keeps the same 4. `?seller=` in the address opens the list already filtered |
| 3 | Open a pending order | Pass. Buyer and seller cards, one item with 300 total, the address with "Smoke Addr Thana, Feni, Chittagong, Bangladesh", the payment Due, one row in each history, and the audit card |
| 4 | Override straight to delivered | Pass. One PATCH with only `{"status":"delivered"}`. The payment turns Paid, each history gets a second row, and the "Changed by" audit field is filled |
| 5 | Override it back to pending | Pass. No block. The order history now has 3 rows |
| 6 | Override to rejected with a reason | Pass. The request carries the reason. "Rejected reason: Fraud check failed" shows, and the history row has "Reason: Fraud check failed" |
| 7 | Override to rejected with no reason | Pass. Apply is enabled, the confirm box says that no reason is allowed, and it succeeds with a body of only `{"status":"rejected"}` |
| 8 | Wrong token | Pass. The API answers 401 with no token and 403 with a seller token and with a buyer token. A signed-out visit to `/admin/orders` goes to the admin login page. (A seller or buyer cannot sign in to the admin site from its screens, so the 403 was checked on the API.) |

## Extra checks

- The select offers exactly 9 statuses and none is disabled.
- "Not now" in the confirm box changes nothing.
- Cancelled with a reason shows "Cancelled reason: ...". Then cancelled to disputed, completed, in progress, shipped and accepted in turn all succeed, so every status is reachable from every status.
- Filters: status accepted shows only Accepted rows. Searching by a seller's name and by a buyer's name both find the right orders. A "created from" date in the future gives an empty list with a message.
- An unknown order number shows "This order does not exist." and the API answers 404. A non-numeric number gives the not-found page.
- The "All orders of this seller" link opens the list for that seller.
- The seller screens still pass their earlier checks after the badge file moved.
- No page errors in the console. `tsc` and `eslint` are clean. The full run was repeated and gave the same result.

## Not tested for real

- Order type `job` and `service`. The filter exists, but the list holds product orders only.
- A 403 that appears while a page is open on the admin site.
- A very long list. The list was tried with about 20 to 60 orders only.

## Notes for the backend

- Moving an order from delivered back to pending leaves the payment Paid, with no new payment history row. That may be intended, but the guide only describes the delivered side effect. If an admin fixes a mistaken delivery, the payment has to be fixed another way.
- Filtering by `order_type=service` returns an empty list with no error. That is fine, but the guide's "service, job" values do not actually return anything here.
- The order list includes the buyer's `wallet_balance` on every row, which this screen does not show.
- The audit columns say `creator_type: "user"` for a buyer. The screen prints it as "(user)". A value of "buyer" would read better.
