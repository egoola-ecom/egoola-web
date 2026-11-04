# QA Guide 6: Buyer Web, Checkout and Orders

This guide explains how a buyer turns a cart into an order, watches it, and cancels it. It covers every screen, every rule, every message and every test case. You do not need to read any code.

## 1. What this feature is

**Checkout** turns one cart into an **order**. In one step the system creates the order, a frozen copy of each item, a frozen copy of the delivery address, and the **payment**. The cart is then closed and can never be checked out again.

- A buyer has a separate cart for each seller. Checkout is done for one cart at a time.
- The only payment method today is **Cash on Delivery**: the buyer pays when the parcel arrives.
- A buyer can **see** their orders and **cancel** one, but only before the seller ships it.
- Delivery cost and discount are always 0 for now, so "To pay" equals the subtotal.

## 2. The two statuses

Every order has two statuses that move side by side. Testers must keep both in mind.

**Order status** (where the parcel is):

| Status | Badge colour | Meaning |
|---|---|---|
| Pending | Yellow | Placed. The seller has not answered yet. The starting status |
| Accepted | Light blue | The seller agreed to fulfil it |
| In progress | Blue | The seller is preparing it |
| Shipped | Grey | On its way. The buyer can no longer cancel |
| Delivered | Green | Arrived |
| Rejected | Black | The seller refused. A reason is shown |
| Cancelled | Red | The buyer cancelled. The reason, if given, is shown |

**Payment status** (where the money is): Due (yellow, the starting status), Started, Paid (green), Failed, Cancelled, Part paid. Only Due and Paid happen today. The payment becomes **Paid on its own** when the order becomes Delivered.

A buyer cannot move an order forward. Only the seller or an admin does that. The buyer's only move is Cancel, allowed while the order is Pending, Accepted or In progress.

## 3. Where things are

| Place | Address | Notes |
|---|---|---|
| Cart | `/buyer/cart` | Has a green **Checkout** button under the subtotal |
| Checkout | `/buyer/checkout?type=product&seller=<id>` | One cart. Signed-in buyers only |
| My orders | `/buyer/orders` | The top bar "Orders" link. 10 per page |
| One order | `/buyer/orders/<id>` | Items, address, payment, both histories |

## 4. The checkout screen

- **Delivery address.** Every saved address is a card with a round button. The newest is chosen first. "Add a new address" opens the same form as the address book, right on this page. After saving, the new address is chosen.
- **No saved address.** The form is already open, a line says "You have no saved address yet. Add one to continue.", and Confirm is disabled.
- **Payment.** Shows "Cash on Delivery — pay when it arrives". It is read from the server's list of active payment methods, not fixed in the page. The buyer cannot change it today.
- **Summary.** Seller name, each line with its amount, and the subtotal. A note says delivery and discount are worked out when you confirm.
- **Confirm order.** Disabled until an address is chosen. Disabled too while any line in the cart is no longer available, with a red note telling the buyer to remove it from the cart first. While it works the button reads "Placing order…" and cannot be pressed twice.
- On success the buyer lands on the new order.

If the cart is empty, or was already checked out, the page says "There is nothing to check out here" with links to My orders and My cart.

## 5. The orders list

Each order is a card: the seller's picture (a shop icon when there is none) and name, "Order #N · placed <date>", the status badge, "To pay" with the amount, and the payment badge. The newest is first. Paging buttons appear when there is more than one page. Clicking a card opens the order.

An empty list says "You haven't placed an order yet" with a button to browse products. A page number past the end says "There are no more orders to show" with a button back to the first page.

There is **no status filter**, because the server does not support one.

## 6. The order screen

- Heading: "Order #N" and the status badge. A red **Cancel order** button sits at the right, only while the order is Pending, Accepted or In progress.
- Cancelled or rejected: a grey bar shows "Cancelled: <reason>" or "Rejected: <reason>".
- The items table: item, price, quantity (or duration for a service), total. Under it: Subtotal, Delivery, Discount and **To pay**.
- **Order history**: a list, newest first, of every status the order has had, with the time and who did it. A cancel with a reason shows "Reason: ...".
- **Delivering to**: the address as it was at checkout, with the place names.
- **Payment**: the method, the amount, the status badge, and its own history list.

### Cancelling

1. Press **Cancel order**. A yellow box asks "Cancel this order? You can only do this before the seller ships it, and it cannot be undone."
2. The reason is optional (up to 500 letters).
3. **Yes, cancel it** cancels. **Keep the order** closes the box.
4. The badge turns Cancelled, the reason is shown, a new row is added to the history, and the Cancel button goes away.

If the order moved on in the meantime (for example the seller shipped it while the page was open), the buyer sees the server's message, such as "This order can no longer be cancelled.", and the page reloads to show the real state.

## 7. Messages

| Situation | Message |
|---|---|
| Cart was already checked out, or does not exist | This cart was already checked out, or it no longer exists. Check My orders. |
| Address not the buyer's | That address is no longer available. Choose another one. |
| Payment method not available | That payment method is not available. Reload and try again. |
| No payment method at all | No payment method is available right now. Please try again later. |
| Cancel too late, or cancel twice | This order can no longer be cancelled. |
| Order not found, or another buyer's | We couldn't find that order |
| Anything unexpected | Something went wrong. Please try again. |

A buyer never sees raw server text such as `Invalid pk` or curly brackets.

## 8. Before you start

You need a buyer who is signed in, a seller's product in stock, and an admin account to move orders along (a buyer cannot do that). Create a buyer on the register page. Put a product in the cart from the product page.

To test the later statuses, an admin can move an order with the admin order API (`PATCH /orders/orders/<id>/` with `{"status": "shipped"}`). Do this in a test database only.

## 9. Test cases

Mark each Pass or Fail.

### A. Reaching checkout

| ID | Steps | Expected |
|---|---|---|
| OR-01 | Signed out, open `/buyer/orders` | Goes to the login page. After signing in you land on the orders list |
| OR-02 | Signed out, open a checkout address | Goes to the login page and returns to checkout after sign-in |
| OR-03 | Put a product in the cart, open the cart | A green Checkout button is under the subtotal |
| OR-04 | Press Checkout | The checkout page shows the cart's lines and subtotal |
| OR-05 | Open checkout for a cart that is empty | "There is nothing to check out here" |
| OR-06 | Open checkout with a made-up seller number | "There is nothing to check out here" |

### B. Address

| ID | Steps | Expected |
|---|---|---|
| OR-10 | A buyer with no saved address opens checkout | The form is open, the line "You have no saved address yet" shows, Confirm is disabled |
| OR-11 | Press Confirm in that state | Nothing happens (it is disabled) |
| OR-12 | Fill and save the form | The new address appears, is chosen, and Confirm is enabled |
| OR-13 | Save an empty form | Messages appear under each empty field, as in the address book |
| OR-14 | A buyer with two addresses opens checkout | Both show, the newest is chosen |
| OR-15 | Choose the other address | The chosen box moves |
| OR-16 | Press "Add a new address" | The form opens. Cancel closes it |
| OR-17 | Add one from here | It is chosen, and the older ones stay |

### C. Payment

| ID | Steps | Expected |
|---|---|---|
| OR-20 | Open checkout | Payment shows "Cash on Delivery — pay when it arrives" |
| OR-21 | Try to change it | There is nothing to change while it is the only method |

### D. Confirming

| ID | Steps | Expected |
|---|---|---|
| OR-30 | Choose an address and press Confirm | The order page opens, status **Pending**, payment **Due** |
| OR-31 | Press Confirm twice quickly | Only one order is made |
| OR-32 | After OR-30, open My cart | That cart is gone (or empty). The cart badge in the top bar drops |
| OR-33 | Check the amount on the order | "To pay" equals the cart subtotal. Delivery and Discount are 0 |
| OR-34 | Check out a cart that has an item taken off sale | A red note says to remove it, and Confirm is disabled |

### E. Checking out the same cart twice

| ID | Steps | Expected |
|---|---|---|
| OR-40 | Open checkout in two browser tabs. Confirm in the first. Confirm in the second | The second shows "This cart was already checked out, or it no longer exists. Check My orders." No raw text |
| OR-41 | Reload the second tab | "There is nothing to check out here" |
| OR-42 | Go back to the cart | The cart is empty or gone |

### F. The order screen

| ID | Steps | Expected |
|---|---|---|
| OR-50 | Open the new order | Seller name, one row per item, price, quantity, total |
| OR-51 | Check the money block | Subtotal, Delivery 0, Discount 0, To pay |
| OR-52 | Check the address card | Name, address lines, place names (thana, city, state, country), zip, phone |
| OR-53 | Check the payment card | Cash on Delivery, the amount, a Due badge, one row "Due" in its history |
| OR-54 | Check the order history | One row "Pending" with the time and the buyer's name |
| OR-55 | Edit the saved address in the address book, then reopen the order | The order still shows the old address |
| OR-56 | Delete the saved address, then reopen the order | The order still shows its address |
| OR-57 | Open `/buyer/orders/999999` | "We couldn't find that order" with a link back |
| OR-58 | Open another buyer's order number | The same "We couldn't find that order" |
| OR-59 | Open `/buyer/orders/abc` | A not-found page |

### G. Cancelling

| ID | Steps | Expected |
|---|---|---|
| OR-60 | Open a Pending order | A Cancel order button shows |
| OR-61 | Press it | A yellow box with a Reason field and two buttons |
| OR-62 | Press "Keep the order" | The box closes. The order is unchanged |
| OR-63 | Cancel with a reason "Changed my mind" | The badge is Cancelled, "Cancelled: Changed my mind" shows, the history has a second row with the reason, the button is gone |
| OR-64 | Cancel another order with no reason | It works. No reason line shows |
| OR-65 | Cancel an Accepted order (admin sets it first) | It works |
| OR-66 | Cancel an In progress order | It works |
| OR-67 | Open a Shipped order | The badge is Shipped and there is no Cancel button |
| OR-68 | Open a Delivered order | No Cancel button. Payment shows Paid, with two rows in its history |
| OR-69 | Open a Cancelled order | No Cancel button |
| OR-70 | Open an order in two tabs. Cancel in the first. Press Cancel then confirm in the second | The second shows "This order can no longer be cancelled." and reloads to Cancelled |
| OR-71 | Open an order in two tabs. An admin ships it. Press Cancel then confirm in the second | The same message, and the page reloads to Shipped without the button |
| OR-72 | Open a Rejected order (admin sets it with a reason) | Badge Rejected, "Rejected: <reason>" shows, no Cancel button |

### H. The list

| ID | Steps | Expected |
|---|---|---|
| OR-80 | A buyer with no orders opens My orders | "You haven't placed an order yet" and a Browse products button |
| OR-81 | A buyer with a few orders | A card each, newest first |
| OR-82 | Check a card | Seller name and picture (or shop icon), order number, date, status badge, To pay, payment badge |
| OR-83 | Click a card | The order opens |
| OR-84 | A buyer with 11 or more orders | Page 1 has 10. Paging buttons show |
| OR-85 | Press 2, or Next | Page 2 shows the rest. The address bar shows `?page=2` |
| OR-86 | Press Previous | Back to page 1 |
| OR-87 | Open `?page=99` | "There are no more orders to show" and a button to the first page |
| OR-88 | Reload on page 2 | Still page 2 |
| OR-89 | Check the badge colours against section 2 | Each status has its own colour |
| OR-90 | The top bar "Orders" link | Goes to the list when signed in, to the login page when not |

### I. Signed out and session

| ID | Steps | Expected |
|---|---|---|
| OR-95 | Sign out in another tab, then press Confirm | Goes to the login page |
| OR-96 | Sign out in another tab, then press Cancel and confirm | Goes to the login page |
| OR-97 | Open the list, sign out elsewhere, press Next | Goes to the login page |

### J. Narrow screen

| ID | Steps | Expected |
|---|---|---|
| OR-100 | View checkout, the list and an order on a phone width | Nothing is cut off. The summary falls under the address. The items table scrolls sideways inside its box |

## 10. Things that look odd but are right

- The order shows the address as it was at checkout. Editing or deleting the saved address later does not change it.
- Delivery and Discount show 0 on every order for now.
- The payment becomes Paid by itself when the order is Delivered. Nobody presses anything.
- The list shows product orders only. An order made from accepting a job bid is reached from that job, not from here.
- The place names come with the order from the server. They show at once with the rest of the page.

## 11. Not available yet

- Any payment method other than Cash on Delivery.
- Coupons, delivery pricing, refunds, reviews and messages about status changes.
- A status filter on the list.
- Checking out a cart of Egoola's own listings (no seller). The server refuses it.
- Reordering.
