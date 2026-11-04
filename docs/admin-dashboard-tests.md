# Admin dashboard: browser test results

Brief: `docs/prd/admin-dashboard-prd.md`. The backend built `GET /api/v1/dashboard/summary/` and the dashboard page now uses it. Run with `next dev` on port 3000 and the Django backend on port 8000, using real Chrome driven by Playwright. The plain admin is `test.admin@egoola.com` and the super-admin is `test.super@egoola.com`, both from `docs/test-accounts.md`.

## What changed

- `src/lib/admin-dashboard-api.ts` (new): `getDashboardSummary` and the response types.
- `src/lib/endpoints.ts`: `ENDPOINTS.admin.dashboard.summary`.
- `dashboard-client.tsx`: the 12 list calls are gone. One call fills four groups of tiles: Needs attention, Orders, Marketplace and Platform totals.
- New tiles: orders waiting for the seller, orders in dispute, orders placed today and this month, paid this month, still to be collected, open carts, jobs open for bids, bids waiting for the buyer, and a row of 9 order-status chips with their counts.
- Every tile links to the matching screen. The order tiles and chips open the orders list already filtered by status. For this, the admin orders page now reads `?status=` from the address (a value that is not one of the 9 statuses is ignored).
- An "Updated hh:mm" time (from `generated_at`) and a Refresh button.
- The Admins tile shows only when the server sends a number. A plain admin gets `null`, so the tile is left out. This replaces the earlier check of the stored admin type.
- The "interim dashboard" note is removed.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Signed out, open `/admin/dashboard` | Pass. Goes to the admin login page |
| 2 | One summary call instead of 12 | Pass. The page asks for the summary once. The browser showed two requests in the dev server, which is React Strict Mode running each effect twice. The orders list, which was not changed, also shows two. The 12 list calls are gone. The other calls on the page (`/accounts/sellers/`, `/catalog/listings/`, `/catalog/gigs/`) are the menu's pending-count badges, which existed before |
| 3 | Every count tile equals the API value | Pass for all 18 count tiles |
| 3b | Money tiles | Pass. "৳10,270" paid this month and "৳100,150" still to be collected, the same as the server's 10270.00 and 100150.00 |
| 4 | Tiles match the real list counts | Pass. Buyers, sellers, listings, gigs, listings pending, gigs pending and sellers pending review each equal the `count` of their own list call |
| 5 | Nine status chips | Pass. Pending 175, Accepted 26, In progress 8, Shipped 3, Delivered 16, Rejected 20, Cancelled 18, Completed 4, Disputed 0 |
| 6 | Plain admin has no Admins tile | Pass |
| 7 | Updated time and Refresh | Pass. Refresh makes one more call |
| 8 | Order tiles and chips | Pass. "Orders waiting for the seller" opens the orders list with the status Pending and only Pending rows. The Delivered chip opens Delivered. A made-up `?status=bogus` is ignored |
| 9 | Other tile links | Pass for buyers, carts, jobs, bids and listing requests |
| 10 | Server error | Pass. A 500 shows "Couldn't load the dashboard. Please try again." and no tiles. Refresh recovers. When a Refresh fails after the numbers were loaded, the old numbers stay on screen with the message |
| 11 | Expired session | Pass. A 401 that survives the token refresh goes to the admin login page |
| 12 | Super-admin | Pass. The Admins tile shows, and equals the API value (2) |
| 13 | Page errors | None. `tsc` and `eslint` are clean |

## Notes

- The server may cache the numbers for about 45 seconds, so a tile can lag a list by that long right after something changes. The "Updated" time shows how fresh the numbers are.
- The status chips and tiles show whatever counts the server sends. A missing status in `by_status` shows as 0.
- The old per-tile "(couldn't load)" is gone. A failure now affects the whole page, as the PRD asks.
- Not tested: a super-admin and a plain admin at the same moment on the same cache, and the page with an empty database.
