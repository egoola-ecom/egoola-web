# Buyer web: Jobs, test record

Browser run (Chrome via playwright-core) against the local backend and the throwaway `egoola` database. Each run registers two fresh buyers. Bids are placed through the admin Bidding API (`POST /bidding/bids/`), because the documented test seller cannot bid. Cases follow the brief's verify table (`egoola-server/docs/prompt/buyer/frontend-buyer-job-prompt.md` section 4).

Routes: `/buyer/jobs` (my jobs), `/buyer/jobs/new`, `/buyer/jobs/[id]` (detail with the bids section), `/buyer/jobs/[id]/edit`. A "Jobs" link sits in the header next to Favourite and Cart, and "My Jobs" in the mobile Account menu. All of them are inside the buyer-only route group, so a signed-out visitor goes to the login page and returns.

| # | Case | Result |
|---|---|---|
| 1 | Post a job with no budget | Pass: the server's 400 "A job needs at least one budget option." shows under the budget section |
| 2 | Post a job with one budget option | Pass: lands on the detail page, `Open for bids` at once |
| 3 | Edit, add a second budget option | Pass: both shown, the first unchanged. Only the new row is sent; the untouched saved row is left out |
| 4 | Pause, then edit a field | Pass: status `Paused`, title edit saved |
| 5 | Reopen | Pass: one click sends `pending`, then `open_for_bidding` |
| 6 | Seller bids, buyer opens the bids section | Pass: both bids listed, Accept on each |
| 7 | Accept a single-option bid | Pass: confirmation with the order id and payable; only "Mark complete" is left; the edit page says the job is hired; a direct PATCH is 400 |
| 8 | The other pending bid | Pass: `rejected`; the accepted one shows `accepted` |
| 9 | Mark complete | Pass: `Completed`, no actions |
| 10 | Cancel a job with two live bids | Pass: both bids `cancelled`, not `rejected` |
| 11 | Accept a two-option bid | Pass: a picker opens first, Accept stays off until one is chosen, the chosen option shows "Hired option" |
| 12 | Another buyer's job id (detail and edit URL) | Pass: "We couldn't find that job." |
| extra | Signed-out redirect, empty state, status filter, search, past-end page, non-numeric id, no page errors | Pass |

Behaviour worth knowing:

- The cancel and mark-complete buttons ask for a second click in the page before sending.
- A saved budget option cannot be removed (the server has no call for it); a new row can be removed before saving.
- Category: one drop-down per level, service categories only. The deepest pick is sent. On edit the saved category is shown by name with a "Change category" button, because its ancestors are not known.
- Two budget rows with the same price type are caught in the browser before sending.
- Empty optional text (Bangla title and description, "includes") is left out of the request unless it was saved before and is now cleared.

Not covered: a phone-width layout review, and the geography and date fields on the form beyond a successful save without them.
