# Seller web: Jobs and Bidding, test record

Browser run (Chrome via playwright-core) against the local backend, throwaway
`egoola` DB. Seller `+8801811000001` (verified, active); unverified seller
`0100000002`. Cases follow the brief's verify table
(`egoola-server/docs/prompt/seller/seller-app-flutter-jobs-bidding-prompt.md` §4).

Routes: `/seller/jobs` (board), `/seller/jobs/[id]`, `/seller/jobs/[id]/bid`,
`/seller/jobs/mine` (All / Won), `/seller/bids`, `/seller/bids/[id]`,
`/seller/bids/[id]/edit`. Jobs tab with Job board / My jobs / My bids.

| # | Case | Result |
|---|---|---|
| 1 | Unverified seller opens the board | Pass: locked page with the reason, no Jobs tab |
| 2 | Verified seller: board lists, Load more (cursor) | Pass: 20 then 40 rows |
| 3 | Filters: urgent, budget max, category | Pass |
| 4 | Job without my bid: Place a bid | Pass |
| 5 | Place a one-tier bid | Pass: pending on the job and in My bids |
| 6 | Second bid on the same job | Pass: blocked in the UI, server 400 "You already have a live bid on this job." |
| 7 | Edit: change price, add a second tier | Pass: first tier updated, second added, total computed |
| 8 | Cancel | Pass: cancelled, Place a bid available again |
| 9 | Fresh bid after cancel | Pass: new row, two rows for the job in My bids; status filter works |
| 10 | Bid accepted by admin | Pass: under My jobs > Won, bid shows Accepted and the Hired tier, no edit or cancel |
| 11 | Job closed after I bid | Pass: still opens, shows final status and my bid |
| 12 | Closed job I never bid on | Pass: not found |
| extra | Non-numeric id, bid on a closed job, empty price | Pass |

Not covered: the seller verify case of a paused (verified, inactive) account,
and a phone-width layout review beyond one screenshot.
