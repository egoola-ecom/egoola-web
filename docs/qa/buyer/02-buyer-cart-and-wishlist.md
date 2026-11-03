# QA Guide 2: Buyer Web, Cart and Wishlist (Favourites)

This guide explains how the cart and the wishlist work on the buyer website and how to test them. It covers every screen, every rule, and every test case, including odd ones. You do not need to read any code.

## 1. What this feature is

Two things a **logged-in buyer** can do:

1. **Cart.** Put products and services in a cart, change the amounts, remove lines, empty a cart. Checkout is **not built yet**, so the cart is a place to collect items and see the total.
2. **Wishlist (also called Favourites).** Tap a heart on a product or service to keep it. See all saved items on the Favourites page.

Both need a login. A visitor who is not logged in is sent to the login page and comes back to the same page afterwards.

## 2. The most important rule: many carts, not one

There is **no single cart**. A buyer has one cart for each pair of **(type, seller)**:

- **Type** is "product" or "service". Products and services never share a cart.
- **Seller** is who sells the item. Items from different sellers go into different carts.
- Items that the platform itself sells (no seller) go into one shared cart, shown as "Egoola".

Example: a buyer adds a product from Seller A, a product from Seller B, and a service from Seller A. The buyer now has **three carts**.

Other facts:

- A cart is created the first time something is added to it.
- A cart that is emptied stays as an empty cart. It is not deleted.
- The same item (same variant or package) added twice becomes **one line**, and the amounts are added together (2 then 3 gives 5).
- There is **no default cart on the server**. When the cart page opens with no choice, it opens the cart that the buyer touched most recently.

### Words used on the screen

| Word | Meaning |
|---|---|
| Line (item) | One row in a cart. One variant or package is one line, whatever the amount |
| Item count | The number of **lines**, not the sum of quantities. Two lines of quantity 5 each is "2 items" |
| Quantity | For a product line, how many pieces |
| Duration | For a service line, how many hours, days, weeks or months |
| Subtotal | Price times amount, added up for a cart |

## 3. Before you start

### 3.1 Accounts and data

- A buyer account. Log in at `/login` with an email or a phone number and a password. Make at least two buyers: one for most tests and one to prove that carts and favourites do not leak between buyers.
- At least **two different sellers** that each have a product, and at least one seller that has both a product and a service.
- A product with options (variants), a product with a limited stock (for example 5 pieces), a sold-out variant, a product from the platform itself (no seller), a service with several packages (hourly and fixed).
- A way to change data from outside: access to the admin or seller screens, to switch off a variant, make a seller inactive, or change stock while a buyer has it in the cart.

### 3.2 Pages

| Page | Address | Login needed |
|---|---|---|
| Cart | `/buyer/cart` or `/buyer/cart?type=product&seller=550` | Yes |
| Favourites | `/buyer/favourites` or `?type=product` / `?type=service` | Yes |
| Product page | `/buyer/product/<id>/<slug>` | No to look, yes to add |
| Service page | `/buyer/service/<id>/<slug>` | No to look, yes to add |

In the cart address, `seller=0` means the platform's shared cart, and no `seller` means "the most recently touched cart of that type".

## 4. How the cart works

### 4.1 Adding to the cart

On a product page:

1. Pick every option (size, colour...). The button stays off until every option is picked and the variant exists and is in stock. A grey line says why: "Pick every option to add it to your cart.", "This combination is not offered.", or "This option is sold out."
2. The **Quantity** box starts at the product's minimum order quantity (1 if there is none). The maximum is the stock left, when stock is tracked.
3. Quantity below 1 shows "Enter 1 or more." Quantity above stock shows "Only N available." and the button is off.
4. Press **Add to cart**.

On a service page:

1. The cheapest package is chosen at the start. Choose another with the radio buttons.
2. For hourly, daily, weekly or monthly packages a box "How many hours (days, weeks, months)" shows. A **fixed price** package has no box.
3. Press **Add to cart**.

After a successful add:

- A green line says "Added to your cart." with a "View cart" link.
- The header cart badge and the "N items in your … cart with this seller" line under the button update at once.

If the buyer is **not logged in**, pressing Add to cart sends them to the login page, and after login they come back to the same product.

If the server says no (for example, stock changed since the page loaded), the server's sentence is shown in red under the button, for example a "not enough stock" message. Any other failure shows "Something went wrong. Please try again."

### 4.2 The header cart

- A **Cart** link with a **badge**. The badge shows the total number of lines in **all** carts (products and services, all sellers). It is not shown when the count is 0 or when nobody is logged in.
- Clicking Cart opens a **drop-down** with one row per cart, newest touched first. Each row shows the seller's name (or "Egoola"), "Products" or "Services", the number of items, and the subtotal. Clicking a row opens exactly that cart.
- A **View all carts** button opens the cart page.
- With no carts, the drop-down says "You have no carts yet."
- Clicking outside the drop-down closes it.
- On a phone, the side menu shows "Cart (N)".
- The badge and the drop-down refresh after every add, change, remove and clear.

### 4.3 The cart page

Top of the page: two tabs, **Products** and **Services**, and a short note that each seller has a separate cart.

**"Your carts" list.** When the buyer has at least one cart, a box shows "Your carts: N (M items in all)" and one row per cart (seller, type, item count, subtotal). The cart that is open is **bold with a light background**. Clicking a row opens that cart.

**Which cart opens:**

| Address | What opens |
|---|---|
| `/buyer/cart` (no type) | The most recently touched cart of any type |
| `/buyer/cart?type=service` | The most recently touched service cart |
| `/buyer/cart?type=product&seller=550` | That seller's product cart |
| `/buyer/cart?type=product&seller=0` | The platform's shared product cart |
| `?type=abc` | Treated as products |

Clicking a tab opens the most recently touched cart of that type.

**Cart content.** At the top of the cart: "Seller: <name>" (a link to the seller page) or "Sold by Egoola", and a **Clear cart** button when the cart has lines.

Each line shows: picture, title (a link to the product or service), the options (colour / size), the product code, the amount control, the price each, the line total, and a bin icon.

- **Amount control.** A minus button, a number box, a plus button. The minus is off at 1. You can type a number and press Enter or click away. The change **replaces** the value: typing 1 when it was 5 makes it exactly 1 (it does not add). For services, a unit label (hours, days...) is shown. A **fixed price** service line has no amount control; it says "Fixed price".
- **Remove (bin icon).** Removes only that line.
- **Clear cart.** Asks "Remove every item from this cart?" in the browser's own box. OK empties the cart. Cancel changes nothing. The cart itself stays, shown as "This cart is empty." with a "Keep shopping" link.
- **Subtotal** at the bottom, with the note "Delivery and any discount are added when you check out."
- While a change is being sent, the controls are disabled so a double click does not send two changes.

**Lines that are no longer available.** If a variant was switched off, the listing is no longer public, or stock is now too low, the line stays in the cart but is **flagged**: the title is struck through, the row looks faded and pink, and a red note says "No longer available as added (out of stock or off sale). It stays here until you remove it." The line is **not hidden**. The buyer must remove it.

**Empty states (they are different on purpose):**

| Situation | Message |
|---|---|
| The buyer never had a cart of this kind | "You have no product cart yet" (or "service cart") with a "Browse products/services" button |
| The cart exists but has no lines | "This cart is empty" with "Keep shopping" |

**Errors.** A failed change shows a red box at the top: the server's own sentence for a rejected value (for example a stock message), "This item is no longer in your cart." when the line was already removed elsewhere, or "Something went wrong. Please try again." A failed load shows "We couldn't load your cart. Please try again."

If the login has expired or the account was suspended, the buyer is sent to the login page.

### 4.4 Small rules the server enforces

- A product line has a quantity. A service line has a duration. Sending the wrong one is refused (the screen never does this, but the server rejects it with a 400 if tried by hand).
- Missing type in the cart call is refused. The screen always sends it.
- Adding a listing that is not public (hidden, rejected, seller inactive) is refused with a message.
- Quantity above the stock is refused with a message.

## 5. How the wishlist works

### 5.1 The heart

- Every product card, service card, and the product and service pages have a **heart "Like"**.
- A saved item shows a **green heart** (and the page says "Liked" on the detail pages).
- Clicking the heart **saves** or **un-saves** at once (the colour changes before the server answers). If the server fails, the heart goes back to how it was.
- Saving the same item twice is fine (it stays one item). Un-saving something that was never saved is also fine, with no error.
- A logged-out visitor who clicks a heart is sent to the login page and returns afterwards.
- When the buyer logs in or the page loads, the system loads the buyer's saved items once so every heart on the page is painted right.

### 5.2 The Favourites page (`/buyer/favourites`)

- Title "My favourites" with three tabs: **All**, **Products**, **Services**.
- Cards are the same cards as the lists, 12 per page, with a pager. Newest saved first.
- A line shows "N saved. A listing that is taken off sale hides here and comes back by itself when it is visible again."
- **Hidden items.** If a saved listing is hidden (the seller became inactive, or the listing was un-approved), it **disappears from the list**. It comes back by itself when it is visible again. It was not deleted.
- Un-saving from the Favourites page: click the heart on a card. (The card stays until the page is reloaded or changed, because the heart is only a toggle; reload to see it gone.)

**Empty states:**

| Situation | Message |
|---|---|
| Nothing ever saved | "You haven't saved anything yet" with a "Browse products" button |
| Saved items exist but none of this type | "No products (services) saved" with "Nothing of this kind in your favourites. Try the other tabs." |

**A page past the last:** "There are no more favourites to show." with a "Back to the first page" button.

## 6. Test cases: Cart

Mark each case Pass or Fail. Keep a screenshot for each Fail.

### 6.1 Access

| ID | Steps | Expected |
|---|---|---|
| CW-01 | Logged out, open `/buyer/cart` | Sent to `/login?next=/buyer/cart`. After login you land on the cart page |
| CW-02 | Logged out, open `/buyer/favourites` | Same: login, then back to favourites |
| CW-03 | Logged out, press Add to cart on a product | Sent to login; after login you are back on the same product |
| CW-04 | Logged out, click the header Cart | No badge. Drop-down says "You have no carts yet." |
| CW-05 | Log in as a seller or admin in another tab, then open the buyer cart | Does not show the seller's data. The buyer area still requires a buyer login |
| CW-06 | Let the session expire (or use an old token) then press a cart button | Sent to login. No crash |

### 6.2 Adding

| ID | Steps | Expected |
|---|---|---|
| CW-10 | Add a product from Seller A | Message "Added to your cart." Badge becomes 1. Line count under the button shows |
| CW-11 | Add a product from Seller B | A second cart. Badge 2. Each seller's cart shows only its own line |
| CW-12 | Add a service from Seller A (who also has a product in the cart) | A third cart, of type service. Products and services stay apart |
| CW-13 | Add the same variant twice (qty 2, then qty 3) | One line with quantity 5 |
| CW-14 | Add two different variants of one product | Two lines in the same cart |
| CW-15 | Add a product from the platform (no seller) | Goes into the "Egoola" cart. `seller=0` in its link |
| CW-16 | Quantity 0, -1, empty, 1.5 | "Enter 1 or more." or whole number used. Button off for the bad ones |
| CW-17 | Quantity above stock (stock 5, type 6) | "Only 5 available." Button off |
| CW-18 | Change stock to 3 by admin after the page loaded, then add 5 | Server message in red; nothing added |
| CW-19 | Sold-out variant | Button off with "This option is sold out." |
| CW-20 | Options not all picked | Button off with the hint |
| CW-21 | Hourly service, duration 3 | Line with duration 3 and an hours label |
| CW-22 | Fixed price service | No number box; line shows "Fixed price" in the cart |
| CW-23 | Product with a minimum order of 10 | Quantity box starts at 10 |
| CW-24 | Double click Add to cart quickly | One add (button shows "Adding…"). Quantity is not doubled by mistake |
| CW-25 | Hide the listing (admin) while the page is open, then Add | A message is shown; nothing is added; no crash |

### 6.3 Header and the carts list

| ID | Steps | Expected |
|---|---|---|
| CW-30 | With 3 carts and 4 lines, look at the badge | 4 (a line count, not quantity) |
| CW-31 | Open the drop-down | 3 rows, newest touched first, each with seller, type, count and subtotal |
| CW-32 | Click a row | That exact cart opens |
| CW-33 | Click "View all carts" | Cart page opens |
| CW-34 | Click outside the drop-down | It closes |
| CW-35 | Remove a line in the cart page | Badge and drop-down update without reload |
| CW-36 | Buyer with no carts | No badge; "You have no carts yet." |
| CW-37 | Add something, go to another page | Badge keeps the right count |
| CW-38 | Phone width | Side menu shows "Cart (N)" |
| CW-39 | Edit a cart so that it becomes the newest | It moves to the top of the drop-down |

### 6.4 Cart page

| ID | Steps | Expected |
|---|---|---|
| CW-50 | Open `/buyer/cart` with several carts | The most recently touched cart opens. The "Your carts" list shows all, the open one in bold |
| CW-51 | Click another row in the list | That cart opens; the bold row moves |
| CW-52 | Click the Services tab | The most recent service cart opens (or the "no service cart yet" message) |
| CW-53 | Open `?type=product&seller=<A>` | Only Seller A's product cart |
| CW-54 | Open `?type=product&seller=0` | The platform's shared cart (or the empty state) |
| CW-55 | Open `?type=product&seller=99999` | "You have no product cart yet" |
| CW-56 | Open `?type=abc` | Treated as products. No crash |
| CW-57 | Click +, then − | Quantity goes up then down, subtotal follows |
| CW-58 | Minus at 1 | Button is off |
| CW-59 | Type 1 when the quantity is 5 and press Enter | Exactly 1 (replaced, not added) |
| CW-60 | Type 0, -3, empty, letters | Nothing is sent; the old number returns |
| CW-61 | Type more than the stock | Red box with the server's message; the old number stays |
| CW-62 | Change a service line duration | Duration updated; subtotal follows |
| CW-63 | Fixed-price service line | No amount control, shows "Fixed price" |
| CW-64 | Remove one line | Only that line goes; other lines stay; subtotal updates |
| CW-65 | Remove the last line | "This cart is empty" with "Keep shopping" |
| CW-66 | Clear cart, press Cancel | Nothing changes |
| CW-67 | Clear cart, press OK | All lines gone; cart still opens as empty; other carts untouched; badge drops by the number of lines cleared |
| CW-68 | Subtotal check | Equals the sum of the line totals |
| CW-69 | Click a line's title | Opens the product or service |
| CW-70 | Click the seller name at the top | Opens the seller page |
| CW-71 | Switch a variant off in the admin or seller screen, then reload the cart | The line stays, struck through, with the red note. Not hidden |
| CW-72 | Make the seller inactive, reload | The affected lines are flagged (or the listing is not available); nothing crashes |
| CW-73 | Remove a flagged line | It goes like any line |
| CW-74 | In two tabs, remove a line in tab 1, then change it in tab 2 | Tab 2 shows "This item is no longer in your cart." and reloads |
| CW-75 | Stop the backend, reload | "We couldn't load your cart. Please try again." |
| CW-76 | Cart with 30 lines | Page stays usable and the subtotal is right |
| CW-77 | Two buyers on two browsers | Neither sees the other's carts |
| CW-78 | Log out, log in as another buyer in the same browser | The cart page and badge show the new buyer's data, not the old buyer's (reload if needed; if old data stays after login without reload, report it) |
| CW-79 | Phone width | Lines stack; no sideways scroll; buttons usable |

## 7. Test cases: Wishlist

| ID | Steps | Expected |
|---|---|---|
| CW-90 | Logged out, click a heart on a card | Sent to login, then back |
| CW-91 | Logged in, click a heart on a card | Turns green at once |
| CW-92 | Reload | Heart still green |
| CW-93 | Click the green heart | Turns normal; reload: still normal |
| CW-94 | Open Favourites | The saved item is there; the count line is right |
| CW-95 | Save from the product page (Like link) | Says "Liked" |
| CW-96 | Save from the service page | Same |
| CW-97 | Tab "Products" and "Services" | Each tab shows only its type. "All" shows both, newest first |
| CW-98 | Favourites with nothing saved | "You haven't saved anything yet" and "Browse products" |
| CW-99 | Only products saved, open the Services tab | "No services saved. Nothing of this kind…" |
| CW-100 | Save 13+ items | Pager shows; page 2 has the rest; 12 per page |
| CW-101 | `?page=99` | "There are no more favourites to show." with "Back to the first page" |
| CW-102 | `?type=abc` | Treated as All |
| CW-103 | Make the seller of a saved item inactive | Item disappears from Favourites. Make the seller active: it returns |
| CW-104 | Hide a saved listing | It disappears from the list, not deleted |
| CW-105 | Heart on a listing in two tabs | After reload both show the same |
| CW-106 | Click the heart many times fast | Ends in the last state; no duplicate |
| CW-107 | Stop the backend, click a heart | The heart goes back to the old colour (no stuck wrong state) |
| CW-108 | Two buyers | Hearts of one do not show for the other |
| CW-109 | Log out and in as another buyer in one browser | New buyer's hearts, not the old buyer's (report if old hearts remain) |
| CW-110 | Heart on a listing from the seller page lists | Works the same |
| CW-111 | Browser console | No red errors on any cart or favourites action |

## 8. Corner cases to try on purpose

- Add 1000 pieces of something with no tracked stock. It should be accepted, or refused with a clear message.
- Add a product, then a different buyer adds the last piece in stock. The first buyer's cart line must be flagged, not crash.
- A product with a discount that ends while it is in the cart. The price each and the subtotal must follow the current price after reload.
- A service whose package is removed while in the cart. The line is flagged.
- Decimal-looking input in quantity ("2.7"). It must act as 2 or be refused, never save a fraction.
- Very large number (99999999999). A clear error, no crash.
- Open the same cart URL in two tabs and clear in one. The other tab must show an empty or "no cart" state after reload, not an error page.
- Go back with the Back button after removing a line. The page shows current data.
- Use the keyboard only: Tab to the amount box, type, Enter.

## 9. Known gaps (not bugs; do not report)

1. **Checkout is not built.** There is no "Place order" button, no orders page. The cart ends at the subtotal.
2. There is **no sign-out button** in the buyer header yet. To switch accounts, clear the stored login or use another browser profile.
3. The server answers "no cart" with an empty body. The site handles it. It is a note for the backend team.
4. The "Messages", "Notifications", "Orders" and "Profile" header links go to pages that are not built yet (404).
5. The hire link on a service card goes to a page that is not built yet.

## 10. How to report a bug

Write: the test ID, which buyer account, the full address, the exact steps, what you expected, what you saw, a screenshot, and the message text if red. Say how many carts and lines the buyer had.
