# Admin Jobs and Bidding: test record

Brief: `egoola-server/docs/prompt/admin/frontend-admin-job-bidding-prompt.md`. Two screens under the
admin menu: **Jobs** (`/admin/jobs`, limit/offset) and **Bidding** (`/admin/bidding`, cursor, "Load more").

Run in a real browser (Chrome driven by a script) against a local backend with a throwaway database,
seeded through the API (12 buyers, 9 sellers, 24 products, 13 gigs, 12 jobs, 19 bids, carts, favourites).

## What was added

- `src/lib/admin-jobs-api.ts`, `src/lib/admin-bids-api.ts`: the two clients.
- `_shared/tier-model.ts`, `_shared/tier-builder.tsx`: one price-tier builder for a job's budget
  (no duration) and a bid's quote (duration, total = price x duration). A saved tier can be
  changed but not removed (the server never deletes one). Only changed rows are sent.
- `_shared/person-picker.tsx`: buyer / seller lookup by name, email or phone.
- Jobs: list (status, category, buyer, dates, search), create on a buyer's behalf, detail with
  status buttons (invalid moves greyed out with a reason), cancel dialog (reason required for a
  hired job), the job's bids, edit (locked once hired, completed or cancelled).
- Bidding: cursor list (status, seller, `?listing=`), create (job picker + seller picker),
  detail with Accept (tier picker only with more than one tier), Reject (reason required),
  Cancel bid, edit (pending only). The accept answer's Order summary is shown after accepting.
- Menu: Jobs and Bidding after Listing.

## Cases

| # | Case | Result |
|---|---|---|
| 1 | Create a job without a buyer | Pass: "Say which buyer this job is for." under the picker |
| 2 | Create a job for a buyer, one budget tier | Pass: open for bidding |
| 3 | Edit the title, add a second tier | Pass: both tiers, first unchanged |
| 4 | Pause, then reopen straight to open | Pass: button greyed out ("must go through Pending"); the server also answers `400` |
| 5 | Create a bid for a seller, one tier | Pass: pending |
| 6 | Second bid for another seller | Pass; a second live bid for the same seller is refused with the server's message |
| 7 | Accept the first bid | Pass: job in progress, other bid rejected, Order #, payable shown |
| 8 | Edit the hired job | Pass: Update disabled, edit page shows it is locked |
| 9 | Reject the accepted bid with a reason | Pass: no reason is blocked; bid rejected, job open again, the other bid stays rejected |
| 10 | Force-cancel a hired job without a reason | Pass: blocked in the dialog |
| 11 | Same cancel with a reason | Pass: job and accepted bid cancelled |
| 12 | Bid with two tiers, accept without picking | Pass: asks for a tier; the picked tier's total is the payable |
| 13 | Filter Bidding by `listing` | Pass: only that job's 3 bids; "Load more" gave 23 rows on the full list |
| 14 | Non-admin token | Checked on the API only: no token `401`, seller and buyer `403` on both endpoints |

`npx tsc --noEmit` and `npx eslint` are clean.

## Notes

- `accepted_price_tier` is the tier's id in the accept answer, the full object in the guide. Both are read.
- There is no Order screen yet; the accept answer is the only place the Order is shown.
