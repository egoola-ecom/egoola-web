# Buyer orders: browser test results

Brief: `egoola-server/docs/prompt/buyer/frontend-buyer-order-prompt.md`. Run with `next dev` on port 3000 and the Django backend on port 8000, using real Chrome driven by Playwright. Buyers were created through the registration API. Carts were filled through the API. A shipped and a delivered order were made by moving an order with the admin order API, because a buyer cannot do that.

## How the order flow shapes the screens

- An order has two statuses that move side by side: the order status (`pending`, `accepted`, `in_progress`, `shipped`, `delivered`, plus `rejected` and `cancelled`) and the payment status (`due` until delivery, then `paid`). Both are shown as badges and both have their own timeline.
- The buyer's only move is to cancel, and only while the order is `pending`, `accepted` or `in_progress`. The Cancel button is shown only in those three states. Once the seller ships, it is gone.
- Delivery and discount are always 0 today, so "To pay" equals the subtotal. The screens still show all the lines, so they stay right when those are built.
- Checkout closes the cart. A closed cart cannot be checked out again, and the server then reports it as "does not exist".
- The order keeps its own copy of the address and the items, so the detail page shows what was ordered even if the saved address or the product changes later.

## What was built

- `src/lib/buyer/buyer-orders-api.ts`: `checkout`, `listOrders`, `getOrder`, `cancelOrder`, `canCancel`, `listPublicGateways`, and `orderProblem`, which turns a failed call into field messages and one general message.
- `src/components/shop/orders/checkout-screen.tsx`: `/buyer/checkout?type=&seller=`. A saved-address picker, an inline "Add a new address" form (the same `AddressForm` as the address book), the payment method, a summary and Confirm.
- `src/components/shop/orders/orders-screen.tsx`: `/buyer/orders`, page based, 10 per page, newest first.
- `src/components/shop/orders/order-detail-screen.tsx`: `/buyer/orders/{id}`. Items, money, address card, Payment card with its own timeline, the order timeline, and Cancel with an optional reason.
- `src/components/shop/orders/order-status.tsx`: the badge colours for the 7 order statuses and 6 payment statuses.
- A Checkout button on the cart screen. The "Orders" link in the top bar already existed.
- Place names come from the server. The backend now sends `country_name`, `state_name`, `city_name` and `thana_name` beside each id, in the order address and in the saved addresses. The screens use `placeText()` and make no geography calls for names. Checked in the browser: the order, address book and checkout pages made 0 requests to `/geography/`.

Rules in the screens:

- The payment method comes from the public list `GET /public/orders/payment-gateways/`. No id is hardcoded. One gateway is shown as plain text, several would be a choice, none disables Confirm with a message.
- Confirm is disabled until an address is chosen, and while any cart line is no longer available.
- A buyer with no saved address sees the address form already open and a line saying to add one.
- A raw "Invalid pk ... does not exist" from the server is shown as "This cart was already checked out, or it no longer exists. Check My orders." (and similar for the address and the gateway).
- A cancel that the server refuses shows the server's message ("This order can no longer be cancelled.") and reloads the order, so the page shows its real state.

## Results for the 8 cases in the brief

| # | Case | Result |
|---|---|---|
| 1 | Checkout with no saved address | Pass. The address form is open, a line says to add one, Confirm is disabled. After saving, the new address is selected and Confirm is enabled |
| 2 | Checkout with a cart, an address, Cash on Delivery | Pass. One POST with the cart, the address and gateway id 11, taken from the public list. The browser goes to the order, which shows Pending and Due |
| 3 | Open the order detail | Pass. One item, the money block, the address with place names, the payment, and one row in each timeline |
| 4 | Check out the same cart again | Pass. A second open checkout page shows "This cart was already checked out, or it no longer exists. Check My orders." The API answers 400. A reloaded checkout says there is nothing to check out |
| 5 | Cancel with a reason | Pass. The badge turns to Cancelled, the reason is shown, the order timeline gets a second row, and the Cancel button goes away |
| 6 | Cancel it again | Pass. From a page left open before the first cancel, the buyer sees "This order can no longer be cancelled." and the page refreshes to Cancelled. The API answers 400 |
| 7 | List, with paging | Pass. With 12 orders, page 1 has 10 (newest first), page 2 has 2, a row opens its detail, and `?page=99` shows "There are no more orders to show" with a way back |
| 8 | No token | Pass. Signed-out visits to the list and checkout go to `/login?next=...`. The API answers 401 |

## Extra checks

- Another buyer's order id gives 404 for both read and cancel. An unknown id shows "We couldn't find that order".
- A shipped order shows no Cancel button. The API refuses a cancel with "This order can no longer be cancelled." and refuses any other status with "A buyer can currently only move an order to cancelled."
- Moving an order to delivered (admin API) makes the payment Paid and adds a second row to the payment timeline.
- The confirm request goes out once. The Confirm button is disabled while the request runs.
- No page errors in the console. `tsc` and `eslint` are clean.

## Found and fixed while testing

- A cart that was already checked out came back as the raw text `Invalid pk "318" - object does not exist.` It is now translated into a plain sentence (see above).
- One test run failed on case 6 only because the check ran before the page refreshed. The product behaviour was right, and the test now waits.

## Not tested for real

- A checkout that fails because a line is out of stock, or an inactive gateway. The first would need stock to change between loading and confirming. The second needs an admin to switch off the only gateway, which would break other tests. The messages are shown from the server's own text.
- A buyer seeing a rejected order. Only the admin or the seller can reject. The page shows the rejected reason the same way as the cancelled one, but this was not run.
- A service cart. Orders are listed as product orders only, so a service checkout was not tried.

## Notes for the backend

- The error for a cart that was already used is `Invalid pk "N" - object does not exist.` It works, but a message such as "This cart was already checked out." would be clearer and would not need translating.
- The buyer order list ignores `?status=`. A request for `status=cancelled` or even `status=bogus` returns every order with no error. The screen has no status filter for that reason. If one is wanted, the backend needs to add it, or to refuse an unknown filter.
- Fixed by the backend: the address in an order and in the address book now carries the place names beside the ids, so the screens no longer look them up.
- A rejected or cancelled order has its reason in `rejected_reason` or `cancelled_reason`, and again in the history. The screen shows the first.
