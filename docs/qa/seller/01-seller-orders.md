# QA Guide: Seller Web, Orders

This guide explains how a seller sees the orders buyers placed with their shop, and moves each one forward. It covers every screen, every rule, every message and every test case. You do not need to read any code. The same features exist in the seller mobile app. This guide is for the website.

## 1. What this feature is

A buyer checks out a cart and that creates an **order** against one seller's shop. The seller's job is to move it along, **one step at a time**, until it is delivered. The seller never creates an order and never edits the delivery address or the payment.

## 2. The two statuses

Every order has two statuses that move side by side.

**Order status** (where the parcel is):

| Status | Badge colour | Meaning |
|---|---|---|
| Pending | Amber | Placed. Waiting for the seller to accept or reject |
| Accepted | Blue | The seller agreed to fulfil it |
| In progress | Blue | The seller is preparing it |
| Shipped | Grey | On its way. The buyer can no longer cancel |
| Delivered | Green | Arrived |
| Rejected | Red | The seller refused it. A reason was given |
| Cancelled | Red | The buyer cancelled it before it shipped |

**Payment status** (where the money is): Due (amber) or Paid (green). Only these two happen today. The payment turns Paid on its own when the order is marked Delivered.

### The moves a seller can make

| The order is | The seller can |
|---|---|
| Pending | **Accept order**, or **Reject order** (a reason is required) |
| Accepted | **Start preparing** |
| In progress | **Mark as shipped** |
| Shipped | **Mark as delivered** |
| Delivered, Rejected, Cancelled | Nothing. The order is finished |

The screen shows only the buttons that are allowed. There is no way to skip a step or go back.

## 3. Where things are

| Place | Address | Notes |
|---|---|---|
| Orders list | `/seller/orders` | The **Orders** tab, after Jobs |
| One order | `/seller/orders/<id>` | Opens from the list |

The Orders tab is shown only to a seller who is verified **and** active. Any other seller does not see the tab. If they type the address, they get a locked page that says why: "Orders are locked" (under review, rejected, or paused).

## 4. The list

Each row shows: "Order #N" and the date, the buyer's name and phone, the status badge, the payment badge, and the amount to collect. The newest order is first. "View Details" or the order number opens it.

**Search and filters** (above the list):

- **Search:** the buyer's name, phone or email. It waits a moment after typing.
- **Status:** All statuses, or one of Pending, Accepted, In progress, Shipped, Delivered, Rejected, Cancelled.
- **From / To:** the dates the order was placed, both included.
- **Clear filters** appears when any filter is on.
- **Refresh** loads the list again from the start.

The list shows 20 at a time. Under it, "N shown" and a **Load more** button appear while there are more. There is **no total count**. When there are no more, the button goes away.

Empty messages: "No orders have been placed with your shop yet." (no filters) or "No orders match these filters." (filters on).

## 5. The order screen

At the top: "Order #N", when it was placed, the status badge and the payment badge. The move buttons are at the right. A line under the title tells the seller where the order stands, for example "A buyer is waiting. Accept the order to start, or reject it with a reason."

If the order was rejected or cancelled, a bar shows the reason ("Rejected: ..." or "Cancelled: ...").

Cards, in this order:

1. **Buyer:** name, phone, email (a dash when there is none), and account status.
2. **Items:** each item with its price, quantity and total, then Subtotal, Delivery, Discount and To collect. Delivery and discount are 0 for now.
3. **Delivery address:** recipient, phone, address lines, the area (thana, city, state, country) and zip. This is the address as it was at checkout.
4. **Payment:** method (Cash on Delivery), amount, status badge, and **Payment history**, newest first.
5. **Order history:** every status the order has had, newest first, with the time and who did it. A row with a reason shows "Reason: ...".

### Making a move

1. Press a move button. A box opens that says what the move does.
2. **Reject order** also shows a **Reason** box (the buyer sees it). The red button stays disabled until a reason with real letters is typed.
3. Press the button in the box to confirm, or **Not now** to close it.
4. The page shows the new status. It is rebuilt from the server's answer, so the history and the payment are always right.

**Mark as delivered** says that the payment is marked paid. After it, the payment badge shows Paid and the Payment history gets a second row.

## 6. Messages

| Situation | What the seller sees |
|---|---|
| Move refused because the order changed (for example the buyer cancelled while the page was open) | A red message with the server's words, for example "Cannot move an order from cancelled to in_progress." The page then reloads to show the real status |
| Reject with no reason | The button stays disabled |
| Order not found, or another seller's | "This order was not found." with a link back |
| Not allowed (403) | "You are not allowed to see this." |
| Anything else | "Couldn't load this order. Please try again." |

## 7. Before you start

You need a seller who is **verified and active**, a product of theirs with stock, and a buyer who has placed orders with that seller. The seeded seller `0100000002` is unverified, so use another or ask an admin to approve one. To place an order, sign in as a buyer, put the seller's product in the cart, and check out (see the buyer orders guide). A buyer can cancel an order from its page.

## 8. Test cases

### A. Reaching the screen

| ID | Steps | Expected |
|---|---|---|
| SO-01 | Signed out, open `/seller/orders` | Goes to the login page |
| SO-02 | Sign in as a verified, active seller | An Orders tab is in the top row, after Jobs |
| SO-03 | Press Orders | The list opens. The Orders tab is highlighted |
| SO-04 | Sign in as an unverified or paused seller | No Orders tab |
| SO-05 | That seller types `/seller/orders` | "Orders are locked" page with a link to the profile |
| SO-06 | A seller with no orders opens the list | "No orders have been placed with your shop yet." |

### B. The list

| ID | Steps | Expected |
|---|---|---|
| SO-10 | A seller with several orders | A row each, newest first |
| SO-11 | Check a row | Order number, date, buyer name and phone, status badge, payment badge, amount |
| SO-12 | With more than 20 orders | 20 rows, "20 shown" and Load more |
| SO-13 | Press Load more | More rows are added below. No row appears twice |
| SO-14 | Keep pressing until the end | The button goes away. No total is shown |
| SO-15 | Choose status Pending | Only Pending rows show |
| SO-16 | Choose each other status | Only that status shows. An empty result shows "No orders match these filters." |
| SO-17 | Type part of a buyer's name | Only that buyer's orders show, after a short wait |
| SO-18 | Search by the buyer's phone, then email | Matches |
| SO-19 | Search for something that does not exist | "No orders match these filters." |
| SO-20 | Set From to tomorrow | Empty |
| SO-21 | Set From and To to today | Today's orders show |
| SO-22 | Press Clear filters | All filters reset and the full list returns |
| SO-23 | Press Refresh | The list reloads from the top |
| SO-24 | Press View Details | The order screen opens |

### C. The order screen

| ID | Steps | Expected |
|---|---|---|
| SO-30 | Open a new order | Status Pending, payment Due |
| SO-31 | Check the buyer card | Name and phone of the buyer |
| SO-32 | Check Items | One row per item with price, quantity and total. To collect equals the sum |
| SO-33 | Check the address | Recipient, address, and the area with place names (not numbers) |
| SO-34 | Check Payment | Cash on Delivery, the amount, a Due badge, one row "Due" in its history |
| SO-35 | Check Order history | One row "Pending" |
| SO-36 | Look at the buttons | Only "Accept order" and "Reject order" |
| SO-37 | Open `/seller/orders/999999` | "This order was not found." |
| SO-38 | Open another seller's order number | The same message |
| SO-39 | Open `/seller/orders/abc` | A not-found page |

### D. Moving forward

| ID | Steps | Expected |
|---|---|---|
| SO-40 | Press Accept order, then confirm | Status Accepted. History gets a second row. The only button is "Start preparing" |
| SO-41 | Press Start preparing, confirm | In progress. The only button is "Mark as shipped" |
| SO-42 | Press Mark as shipped, confirm | Shipped. Payment is still Due. The only button is "Mark as delivered" |
| SO-43 | Press Mark as delivered | The box says the payment is marked paid |
| SO-44 | Confirm | Status Delivered. Payment shows **Paid**. Payment history has two rows. Order history has five. No buttons |
| SO-45 | Press "Not now" in any box | The box closes. The order is unchanged |
| SO-46 | Press the X of the box | The same |
| SO-47 | Look at an Accepted order | There is no Shipped or Delivered button |
| SO-48 | Press a move button twice quickly | Only one move is made |
| SO-49 | The buyer's name appears on the first history row; yours on later rows | Each row has the person who made the move |

### E. Rejecting

| ID | Steps | Expected |
|---|---|---|
| SO-50 | On a Pending order press Reject order | A box with a Reason field. The red button is disabled |
| SO-51 | Type only spaces | Still disabled |
| SO-52 | Type a reason | The button is enabled |
| SO-53 | Confirm | Status Rejected. "Rejected: <reason>" shows. The history row has "Reason: <reason>". No buttons |
| SO-54 | Check the buyer's order page | The buyer sees the rejection and the reason |
| SO-55 | Try Reject on an Accepted order | No Reject button. Only Start preparing |
| SO-56 | Open the rejected order again | No buttons. It is finished |

### F. When the order changes under you

| ID | Steps | Expected |
|---|---|---|
| SO-60 | Open a Pending order. As the buyer, cancel it. Then press Accept and confirm | A red message "Cannot move an order from cancelled to accepted." The page reloads to Cancelled, with the buyer's reason, and no buttons |
| SO-61 | Open the same order in two seller tabs. Accept in the first. Press Accept in the second | A red message, and the second tab reloads to Accepted |
| SO-62 | Open a Shipped order. As the buyer, try to cancel | The buyer is refused. The seller's order is unchanged |
| SO-63 | Open a Cancelled order | The bar shows "Cancelled: <reason>". No buttons |

### G. Session

| ID | Steps | Expected |
|---|---|---|
| SO-70 | Sign out in another tab, then press a move button | Goes to the login page |
| SO-71 | Sign out in another tab, then press Load more | Goes to the login page |
| SO-72 | An admin pauses the seller while the list is open, then press Refresh | The seller sees the server's message and the Orders tab goes away |

### H. Narrow screen

| ID | Steps | Expected |
|---|---|---|
| SO-80 | View the list and an order on a phone width | Nothing is cut off. The table scrolls sideways inside its box |

## 9. Things that look odd but are right

- There is no total number of orders. The list is cursor paged, so only "N shown" appears.
- Delivery and Discount show 0 on every order for now.
- The payment becomes Paid by itself when the order is delivered. The seller presses nothing for it.
- The seller sees the buyer's cancel reason but cannot undo a cancel.
- Only product orders are listed. Orders made from a job bid are reached from the job.
- The address is a frozen copy. If the buyer later edits or deletes the saved address, this order does not change.

## 10. Not available yet

- Editing the delivery address or the payment.
- Coupons, delivery pricing, and any payment method other than Cash on Delivery.
- A push message for a new order.
- Moving an order backwards or skipping a step. Only an admin can do that.
