# QA Guide: Admin Web, Dashboard

This guide explains the admin dashboard, what each number means, and how to test it. You do not need to read any code.

## 1. What it is

The dashboard is the first admin page (`/admin/dashboard`). It gives a quick look at what needs an admin's attention and at the size of the platform. All numbers come from one server call, so they are one snapshot. The server may keep the numbers for up to about a minute.

## 2. The screen

At the top: the title, "Updated hh:mm" (when the server computed the numbers) and a **Refresh** button. Every tile is a link to the screen that holds the records behind the number.

**Needs attention**

| Tile | Opens |
|---|---|
| Sellers waiting for verification review | Sellers |
| Sellers not yet verified | Sellers |
| Product listings waiting for moderation | Listing requests |
| Product listings with changes requested | Listings, filtered |
| Gigs waiting for moderation | Gig requests |
| Gigs with changes requested | Gigs, filtered |
| Orders waiting for the seller | Orders, filtered to Pending |
| Orders in dispute | Orders, filtered to Disputed |

**Orders**

| Tile | Meaning |
|---|---|
| Orders placed today | Orders created today (Dhaka time) |
| Orders placed this month | Orders created this calendar month |
| Paid this month | Total of the orders whose payment turned Paid this month |
| Still to be collected | Total of the orders whose payment is still Due, leaving out cancelled and rejected orders |

Under these tiles is a row of **9 status chips** (Pending, Accepted, In progress, Shipped, Delivered, Rejected, Cancelled, Completed, Disputed) each with a count. A chip opens the orders list for that status.

**Marketplace:** Open carts, Jobs open for bids, Bids waiting for the buyer.

**Platform totals:** Buyers, Sellers, Product listings, Gigs, Banners live now, and **Admins** (shown only to a super-admin).

## 3. Rules

- A plain admin never sees the Admins tile. A super-admin does.
- Money is shown with the taka sign and no decimals when whole, for example "৳10,270".
- Each number equals the count of the matching list. If a tile and its list differ, the server's one-minute cache is the most likely reason. Press Refresh, and if still different, report it.
- If the page cannot load, it shows "Couldn't load the dashboard. Please try again." and no tiles. If Refresh fails after the numbers were showing, the old numbers stay with the message.

## 4. Test cases

| ID | Steps | Expected |
|---|---|---|
| AD-01 | Signed out, open `/admin/dashboard` | Goes to the admin login page |
| AD-02 | Sign in as the plain admin | The dashboard opens with four groups of tiles |
| AD-03 | Look at the top right | "Updated" with a time, and a Refresh button |
| AD-04 | Check Platform totals as a plain admin | No Admins tile |
| AD-05 | Sign in as a super-admin | The Admins tile shows a number |
| AD-06 | Compare Buyers with the Buyers list | The same total |
| AD-07 | Compare Sellers, Product listings and Gigs with their lists | The same totals |
| AD-08 | Compare "listings waiting for moderation" with Listing requests | The same count |
| AD-09 | Compare the three seller and gig tiles with their lists | The same counts |
| AD-10 | Add a buyer, then press Refresh | The Buyers number goes up, at once or within about a minute |
| AD-11 | Place an order as a buyer, then Refresh | Orders today, this month and Pending go up by one (after the cache time) |
| AD-12 | Look at the 9 status chips | All 9 show, and the counts add up to the total orders |
| AD-13 | Press "Orders waiting for the seller" | The orders list opens, with status Pending chosen and only Pending rows |
| AD-14 | Press the Delivered chip | The orders list opens for Delivered |
| AD-15 | Press the Orders in dispute tile | The list for Disputed (empty is fine) |
| AD-16 | Mark an order delivered as admin, then Refresh | Delivered goes up, Pending (or its old status) goes down, and "Paid this month" rises by the order's amount |
| AD-17 | Cancel an unpaid order, then Refresh | "Still to be collected" falls by its amount |
| AD-18 | Press each remaining tile | It opens the right screen |
| AD-19 | Press Refresh | The page asks the server again and the time updates |
| AD-20 | Open `/admin/orders?status=bogus` | The status filter stays on "All statuses" |
| AD-21 | Stop the backend, open the dashboard | "Couldn't load the dashboard. Please try again." and no tiles |
| AD-22 | Start the backend, press Refresh | The tiles return |
| AD-23 | With the numbers showing, stop the backend and press Refresh | The message shows and the old numbers stay |
| AD-24 | Sign out in another tab, then press Refresh | Goes to the admin login page |
| AD-25 | View the page at a tablet or phone width | Tiles wrap into fewer columns. Nothing is cut off |

## 5. Things that look odd but are right

- Two requests for the summary may show in the Network tab in development. This is the development server, and it does not happen in a production build.
- The menu has its own small badges (pending sellers, listings, gigs). They come from separate calls, not from the dashboard.
- A very recent change may not show for up to about a minute, because of the server's cache.
