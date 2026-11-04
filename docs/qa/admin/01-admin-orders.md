# QA Guide: Admin Web, Orders

This guide explains how an admin sees every order on the platform and moves any of them to any status. It covers every screen, every rule, every message and every test case. You do not need to read any code.

## 1. What this feature is

A buyer checks out a cart and that creates an **order** with one seller. A seller moves it forward one step at a time. The admin sees **all** orders, from every buyer and every seller, and can move an order to **any status, from any status, at any time**. This is the safety valve for fixing a mistake or settling a dispute. The admin never creates an order and never edits the address, the items or the payment directly.

## 2. The statuses

**Order status.** An admin can pick any of these 9:

| Status | Badge colour | Meaning |
|---|---|---|
| Pending | Amber | Placed. Waiting for the seller |
| Accepted | Blue | The seller agreed |
| In progress | Blue | The seller is preparing it |
| Shipped | Grey | On its way |
| Delivered | Green | Arrived |
| Rejected | Red | Refused |
| Cancelled | Red | Cancelled |
| Completed | Green | Finished |
| Disputed | Amber | Under dispute |

The colours are the same as on the seller screens.

**Payment status:** Due (amber) or Paid (green) are the only ones in use today. Other values (Started, Failed, Cancelled, Part paid) exist for future payment methods.

**The one automatic link:** when an order is moved to **Delivered**, a payment that is Due turns **Paid** by itself, and a row is added to the payment history. Nothing else moves the payment.

## 3. Where things are

| Place | Address | Notes |
|---|---|---|
| Orders list | `/admin/orders` | The **Orders** entry in the left menu, after Wishlists |
| One order | `/admin/orders/<id>` | Opens from the list |
| List for one person | `/admin/orders?seller=<id>` or `?buyer=<id>` | From the "All orders of this seller" and "All orders of this buyer" links |

Only a signed-in admin can open these. Anyone else goes to the admin login page.

## 4. The list

Each row: "Order #N" and the date, the buyer's name and phone, the seller's name and phone, the status badge, the payment badge, and the payable amount. The newest is first. The list shows 20 at a time, with "N orders shown — more available" and a **Load more** button. There is **no total count**. At the end the button says "No more orders".

**Filters**

- **Search:** the buyer's name or phone, or the seller's name. It waits a moment after typing.
- **Status:** All statuses, or one of the 9.
- **Type:** All types, Product, Service or Job. Only product orders appear today.
- **Buyer** and **Seller:** type a name, email or phone and pick a person from the list. The picked person shows with a **Change** button. Both can be used together.
- **Created from / to:** both dates are included.
- **Clear filters** appears when any filter is on. **Refresh** loads the list again from the top.

Empty messages: "No orders have been placed yet." (no filters) or "No orders match these filters." (filters on).

## 5. The order screen

Top: "Order #N", the type and the date placed, the status badge and the payment badge.

Cards, in this order:

1. **Change status.** A **New status** select that holds all 9 statuses, starting on the current one. A **Reason** box appears only when Rejected or Cancelled is chosen. The reason is optional. **Apply status** is disabled only while the chosen status is the current one.
2. **People.** The buyer (name, phone, email, wallet, account status) and the seller (name, phone), each with a link to all of their orders. Names link to their own admin pages.
3. **Items.** Each item with its price, quantity and total, then Total (before discount), Subtotal, Delivery, Discount and Payable.
4. **Delivery address.** Recipient, phone, address lines, the area (thana, city, state, country) and zip. This is a frozen copy from checkout.
5. **Payment.** Method, amount, status badge and **Payment history**, newest first.
6. **Order history.** Every status the order has had, newest first, with the time and who made the move (name and type). A row with a reason shows "Reason: ...".
7. **Record.** Created, created by, last changed, changed by, expected delivery and completed.

If the order was rejected or cancelled, a bar under the title shows "Rejected reason: ..." and or "Cancelled reason: ...".

### Changing the status

1. Pick the new status. For Rejected or Cancelled a Reason box shows. A reason is optional, but filling it in is encouraged.
2. Press **Apply status**. A box asks "Move order #N from A to B?". For Delivered on a Due payment it adds "The payment will be marked paid." If a reason was not given for Rejected or Cancelled, it says that this is allowed.
3. Press **Change status** to confirm, or **Not now** to close.
4. The page shows the new status, everything refreshed from the server's answer, and a green line "Order #N moved from A to B."

There is no rule about the order of moves. Delivered back to Pending is allowed. So is Rejected to Shipped.

## 6. Messages

| Situation | What the admin sees |
|---|---|
| Order number does not exist | "This order does not exist." |
| Not allowed (403) | "You are not allowed to see this." (or "...change this order.") |
| The server refuses a move | The server's own words, in red inside the confirm box |
| Load fails | "Couldn't load this order. Please try again." |
| Signed out or session over | The admin login page |

## 7. Before you start

You need an admin account and some orders. To make orders, sign in as a buyer, put a seller's product in the cart and check out (see the buyer orders guide). The seller can move orders from the seller site.

## 8. Test cases

### A. Access

| ID | Steps | Expected |
|---|---|---|
| AO-01 | Signed out, open `/admin/orders` | Goes to the admin login page |
| AO-02 | Sign in as an admin | An Orders entry is in the menu, after Wishlists |
| AO-03 | Press Orders | The list opens and Orders is highlighted |
| AO-04 | Sign in as a seller or buyer on their own site, then open `/admin/orders` | Goes to the admin login page (they have no admin session) |
| AO-05 | Open `/admin/orders/<id>` while signed out | Goes to the admin login page |

### B. The list

| ID | Steps | Expected |
|---|---|---|
| AO-10 | Open the list with no filters | Orders from every seller, newest first |
| AO-11 | Check a row | Order number, date, buyer name and phone, seller name and phone, status badge, payment badge, payable |
| AO-12 | With more than 20 orders | 20 rows and "Load more" |
| AO-13 | Press Load more | More rows are added. No row twice. No total is shown |
| AO-14 | Keep pressing to the end | The button says "No more orders" and is disabled |
| AO-15 | Pick a seller with the Seller picker | Only that seller's orders show |
| AO-16 | Pick a buyer too | Only orders of that buyer with that seller |
| AO-17 | Press Change on a picked person | The picker returns to a search box |
| AO-18 | Choose status Accepted | Only Accepted rows |
| AO-19 | Choose each other status, including Completed and Disputed | Only that status. An empty result shows "No orders match these filters." |
| AO-20 | Choose type Service, then Job | Empty, with the message. Type Product shows the orders again |
| AO-21 | Search a seller's name | That seller's orders |
| AO-22 | Search a buyer's name, then phone | That buyer's orders |
| AO-23 | Search for something that does not exist | "No orders match these filters." |
| AO-24 | Set Created from to tomorrow | Empty |
| AO-25 | Set both dates to today | Today's orders |
| AO-26 | Press Clear filters | Everything resets, including the pickers |
| AO-27 | Press Refresh | The list reloads from the top |
| AO-28 | Open `/admin/orders?seller=<id>` | The list is already narrowed, and the Seller box shows that seller |
| AO-29 | Open `/admin/orders?seller=abc` | The bad value is ignored. All orders show |
| AO-30 | Press View or the order number | The order screen opens |

### C. The order screen

| ID | Steps | Expected |
|---|---|---|
| AO-40 | Open a Pending order | Status Pending, payment Due |
| AO-41 | Check People | Buyer and seller names, phone, wallet and account status |
| AO-42 | Press the buyer's name | The buyer's admin page opens |
| AO-43 | Press "All orders of this seller" | The list for that seller |
| AO-44 | Check Items | One row per item. The money lines add up |
| AO-45 | Check the address | Recipient, address and the area with place names, not numbers |
| AO-46 | Check Payment | Cash on Delivery, the amount, Due, one history row |
| AO-47 | Check Order history | One row "Pending" with the buyer's name and "(user)" |
| AO-48 | Check Record | Created and created by are filled. Changed by shows a dash |
| AO-49 | Open `/admin/orders/999999` | "This order does not exist." |
| AO-50 | Open `/admin/orders/abc` | A not-found page |

### D. Changing the status

| ID | Steps | Expected |
|---|---|---|
| AO-60 | Look at the New status select | 9 statuses, none disabled, starting on the current one |
| AO-61 | Look at Apply status | Disabled while the chosen status is the current one |
| AO-62 | Choose Delivered, press Apply | The box says the payment will be marked paid |
| AO-63 | Press Not now | Nothing changes |
| AO-64 | Apply again and press Change status | Status Delivered. Payment Paid. The payment history and the order history each have a second row. A green line says "moved from Pending to Delivered" |
| AO-65 | Check Record | Changed by now shows the admin |
| AO-66 | Move the order back to Pending | It works. No block. The order history has a third row |
| AO-67 | Look at the payment after AO-66 | It is still Paid (see the notes) |
| AO-68 | Move through every status in turn, including Disputed and Completed | Each move works, whatever the current status |
| AO-69 | Move an order to Shipped, then to Accepted | It works (backwards) |

### E. Rejecting and cancelling

| ID | Steps | Expected |
|---|---|---|
| AO-70 | Choose Rejected | A Reason box appears |
| AO-71 | Choose Shipped | The Reason box goes away |
| AO-72 | Choose Rejected, type "Fraud check failed", apply, confirm | Status Rejected. "Rejected reason: Fraud check failed" shows. The history row has the reason |
| AO-73 | On another order choose Rejected, leave the reason empty, apply | Apply is enabled. The box says no reason was given and that this is allowed |
| AO-74 | Confirm | Status Rejected with no reason. No error |
| AO-75 | Choose Cancelled with a reason "Customer asked" | Status Cancelled. "Cancelled reason: Customer asked" shows |
| AO-76 | Choose Cancelled with no reason | It works |
| AO-77 | Type only spaces as the reason | Treated as no reason. It works |
| AO-78 | Type a reason, then change the choice to Shipped, apply | The reason is not sent. No reason line shows |

### F. Seller and buyer sides

| ID | Steps | Expected |
|---|---|---|
| AO-80 | Move an order to Shipped as admin, then open it as the buyer | The buyer sees Shipped and no Cancel button |
| AO-81 | Move it to Delivered | The buyer and the seller see Delivered and a Paid payment |
| AO-82 | Move a Pending order to Rejected with a reason | The seller sees "Rejected: <reason>". The buyer sees it too |
| AO-83 | Move a Delivered order back to Pending | The seller sees it as Pending and gets the Accept and Reject buttons again |

### G. Errors and session

| ID | Steps | Expected |
|---|---|---|
| AO-90 | Sign out in another tab, then press Apply and confirm | Goes to the admin login page |
| AO-91 | Sign out in another tab, then press Load more | Goes to the admin login page |
| AO-92 | Use a seller's token on the orders API | 403 |
| AO-93 | Use no token | 401 |

### H. Narrow screen

| ID | Steps | Expected |
|---|---|---|
| AO-100 | View the list and an order on a tablet or phone width | Nothing is cut off. The table scrolls sideways inside its box |

## 9. Things that look odd but are right

- There is no total number of orders. The list is cursor paged, so only "N orders shown" appears.
- Delivery and Discount show 0 on every order for now.
- The admin can move an order backwards. Seller and buyer screens cannot.
- The payment turns Paid by itself when the order becomes Delivered. Moving the order away from Delivered does **not** turn the payment back to Due.
- Creator names show a type in brackets, for example "(user)" for a buyer.
- The Type filter has Service and Job, but only product orders exist in this list.

## 10. Not available yet

- Editing the address, the items or the payment of an order.
- Changing the payment status directly.
- Refunds, coupons, delivery pricing, and any payment method other than Cash on Delivery.
- A message to the buyer or seller when an admin changes a status.
