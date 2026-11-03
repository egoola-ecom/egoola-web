# QA Guide 3: Buyer Web, Jobs and Bidding

This guide explains how a buyer posts a job, receives bids from sellers, and hires one seller. It covers every screen, every rule, every status, and every test case, including odd ones. You do not need to read any code.

## 1. What this feature is

A **job** is a piece of work that a buyer needs done. This is different from buying a product or a service from a shop. The buyer writes what is needed and how much they can pay. Sellers then place **bids** (offers). The buyer picks one bid and **hires** that seller.

The flow, in short:

1. The buyer **posts a job** with a budget. The job is live at once. There is no review step.
2. Sellers see the job and place bids. (Sellers do this in the Seller website, not in the buyer website.)
3. The buyer opens the job and sees the list of bids.
4. The buyer **accepts** one bid. That seller is hired. An **order** is created at once.
5. When the work is done, the buyer presses **Mark complete**.

The buyer can also **edit**, **pause**, **reopen** and **cancel** a job, as long as nobody has been hired yet.

Important: **the buyer never places a bid.** Only sellers do. The buyer only receives bids and accepts one.

## 2. Words used

| Word | Meaning |
|---|---|
| Job | The work request posted by the buyer |
| Budget option | One way the buyer is willing to pay: a price type (fixed, hourly, daily, weekly, monthly), a price and an optional note. A job needs at least one |
| Bid | A seller's offer on a job |
| Bid option (price tier) | One price a seller quoted inside a bid. A bid can quote more than one (for example a fixed price and an hourly price) |
| Accept | The buyer picks a bid. The seller is hired |
| Order | Created automatically on accept. The screen shows its number and amount |

## 3. Job statuses

| Status shown | What it means | What the buyer can do |
|---|---|---|
| **Open for bids** | Live. Sellers can bid | Edit, Pause, Cancel. Accept a bid |
| **Paused** | The buyer paused it. Sellers cannot bid | Edit, Reopen, Cancel |
| **Reopening** | A short middle step while reopening a paused job. It normally lasts a moment. It can be seen only if the second step failed | Edit, Reopen, Cancel |
| **In progress** | A seller is hired | **Mark complete** only. No edit, no cancel |
| **Completed** | The work is done | Nothing. Read only |
| **Cancelled** | The buyer cancelled | Nothing. Read only |

How a job moves:

| From | To | Done by |
|---|---|---|
| Open for bids | Paused | Pause button |
| Open for bids | Cancelled | Cancel job button (asks to confirm) |
| Paused | Reopening, then Open for bids | Reopen button. One click sends two requests |
| Paused or Reopening | Cancelled | Cancel job button |
| Open for bids | In progress | Accept on a bid |
| In progress | Completed | Mark complete button (asks to confirm) |

Rules:

- A **paused** job cannot go straight back to open at the server. The screen handles this by sending the middle step for you.
- A buyer **cannot cancel a job that is in progress.** Only an admin can. The screen hides the Cancel button then.
- When a job is **cancelled**, every live bid on it becomes **cancelled** (not "rejected"). The server does this. The screen shows the new bid statuses.
- When a bid is **accepted**, every other pending bid on that job becomes **rejected**.
- A job can be edited while it is Open for bids, Paused or Reopening. It cannot be edited once In progress, Completed or Cancelled.
- There is **no delete**. A job is cancelled instead.

## 4. Before you start

### 4.1 Accounts

- At least **two buyers**. Buyer 1 does the main tests. Buyer 2 proves that one buyer cannot see another buyer's jobs.
- A way to place bids as sellers. There are two ways:
  1. Log in to the **Seller website** with a **verified, active** seller and place a bid on the buyer's job (Jobs tab, "Job board"). This is the real way. An unverified seller cannot bid.
  2. Use the **Admin website**: Bidding, create a bid for a chosen seller on the job. This is a quick way to prepare test data.
- You need **several sellers** for the cases with more than one bid.
- An admin account, to try things only an admin can do (for example cancel a hired job).

### 4.2 Pages

| Page | Address |
|---|---|
| My jobs | `/buyer/jobs` |
| Post a job | `/buyer/jobs/new` |
| One job (with its bids) | `/buyer/jobs/<id>` |
| Edit a job | `/buyer/jobs/<id>/edit` |

A **"Jobs"** link is in the header (next to Favourite and Cart), and **"My Jobs"** is in the side menu on a phone. A logged-out visitor who clicks it goes to the login page. All four pages need a buyer login; a logged-out visitor is sent to login and comes back to the same page.

## 5. How the screens work

### 5.1 My jobs (`/buyer/jobs`)

- Title "My jobs" and a green **Post a job** button.
- A search box (searches title and description), a **status** drop-down (Any status, Open for bids, Paused, Reopening, In progress, Completed, Cancelled), a **Search** button, and a **Clear** button (shown only when a filter is active).
- Ten jobs per page, newest first, with numbered pages.
- Each job is a row showing: title, a coloured status badge, category, "posted <date>", a yellow "Urgent" badge when urgent, the **budget** (the cheapest active budget option, with "/ hour" and so on, or "none set"), and the number of bids ("1 bid", "3 bids"). The bid count counts **every bid ever placed**, whatever its status.
- Clicking a row opens the job.
- The status choice and the search words are kept in the address (`?status=…&search=…&page=…`), so reload and Back work.
- **Empty states:** a buyer with no jobs sees "You haven't posted a job yet" and "Post your first job". A search or filter with no match says "No jobs match this search."
- **A page past the last:** "There are no more jobs to show." and "Back to the first page".
- A failed load shows a red message.

### 5.2 Post a job (`/buyer/jobs/new`)

Title: "Post a job". Fields:

| Field | Required | Notes |
|---|---|---|
| Category (service) | Yes | One drop-down per level. Only **service** categories are offered. When you pick a category that has sub-categories, a new drop-down appears below it. The deepest one picked is used. Emptying a lower drop-down falls back to the one above |
| Title | Yes | |
| Description | Yes | |
| "Add Bangla text (optional)" | No | A link that opens Title (Bangla) and Description (Bangla). The link then says "Hide Bangla fields" |
| What the work includes | No | |
| Needed within (days) | No | A whole number, 1 or more |
| This job is urgent | No | A check box |
| Available from, Available to | No | Dates |
| Where | No | Country, division, district, thana. Each fills after the one above. Changing a higher level empties the lower ones |
| Your budget | **Yes, at least one option** | See below |

**Budget options.**

- A row has a **price type** (Fixed price, Hourly, Daily, Weekly, Monthly), a **price** and an optional **note**.
- **One row per price type.** Two rows with the same type are not allowed. The screen warns before sending: "Two budget options use the same price type (…). Use one row per type."
- **+ Add another budget option** adds a row with the first price type that is still free. The button disappears when all five types are used.
- A **new** row (not saved yet) has "Remove this option" when there is more than one row.
- A row with no price is ignored when saving. If every row is empty, the job is sent with no budget and the server refuses: **"A job needs at least one budget option."** This message is shown **under the budget section**.

**Buttons:** **Post job** (shows "Saving…" while sending) and **Cancel** (back to My jobs).

**After success:** the buyer lands on the new job's page. The job is **Open for bids** at once. There is no "pending review" state.

**Errors:** the server's sentence is shown near the field it belongs to (category, title, description, dates, budget...). An error that belongs to no field is shown in a red box at the top of the form. The buyer's typing is not lost after an error.

### 5.3 Job page (`/buyer/jobs/<id>`)

Top part:

- Title, status badge, category, "posted <date>", urgent badge, "needed within N days".
- Description (line breaks kept), "Includes", "Available: from to".
- **Budget** list: only the **active** budget options, with note. If none is active: "No budget option is active."
- An admin note (if the admin left one) in a blue box.
- A red box shows the reason when an action fails.

**Action buttons** (these depend on the status; see the table in section 3):

- **Edit** opens the edit form.
- **Pause** pauses at once.
- **Reopen** sends two requests (Paused → Reopening → Open). If the job is already "Reopening" it sends only the second one.
- **Cancel job** opens a yellow box: "Cancel this job? Every bid on it will be cancelled too, and this cannot be undone." with **Yes, cancel the job** and **Keep it**.
- **Mark complete** (only for In progress) opens a yellow box: "Mark this job as complete? Do this only when the work is done." with **Yes, it is complete** and **Not yet**.
- While an action is being sent, the buttons are off.
- Completed and Cancelled jobs show no buttons at all.

**Hire confirmation.** Right after accepting a bid, a green box says: "<seller name> is hired. Order #<number> is in progress, payable <amount>. Every other pending bid was rejected." This box is shown **until the page is reloaded**. After a reload, the page shows a blue line "Hired: <seller name>" instead. There is no Orders page yet, so this is the only place the order number is visible.

### 5.4 The bids section (on the job page)

- Title "Bids (N placed)". N is the total number of bids ever placed.
- A **status filter**: Any status, Pending, Accepted, Rejected, Cancelled. Changing it goes back to page 1.
- Ten bids per page, newest first, with numbered pages.
- Each bid shows: the seller's name, a status badge (pending, accepted, rejected, cancelled), the date placed, the seller's message, the **price options** (price with unit, for non-fixed ones "price × duration = total"), the seller's note on each option, and the proposed start and end dates.
- All bids are shown, including lost bids, so the buyer sees the whole history.
- **Empty:** "No bids yet. Sellers who bid will show here." With a filter: "No bids with this status."

**Accept button.** Shown only on a **pending** bid and only while the job is **Open for bids**. A job that is Paused, In progress, Completed or Cancelled shows no Accept buttons.

- **Bid with one option:** pressing Accept hires at once.
- **Bid with more than one option:** pressing Accept shows radio buttons on the options and the text "This bid has more than one option. Choose the one you are accepting." The button **Accept this option** is off until one option is chosen. **Back** closes the choice.
- After accepting: the job becomes In progress, the chosen bid becomes accepted, the other pending bids become rejected, and the chosen option shows a green "Hired option" badge.

### 5.5 Edit a job (`/buyer/jobs/<id>/edit`)

- Same form as "Post a job", but filled with the saved values. The title is "Edit job" and the button says "Save changes".
- **Category** shows the saved category name with a "Change category" button (the parents of the saved category are not known, so the picker starts again when changed).
- **Budget options work in "reconcile" mode:**
  - A saved option can be changed in place (price, type, note). It cannot be removed.
  - A new row can be added. It has no id until saved.
  - **Only changed rows are sent.** A saved option the buyer did not touch is not sent and stays as it was.
  - To hide an option the buyer cannot delete it from this screen. (The server supports hiding one, but the buyer screen has no control for it. This is expected.)
- Edit is allowed while the job is Open for bids, Paused or Reopening.
- If the job is In progress, the edit page says: "This job has been hired. Only an admin can change it now; you can still mark it complete." If Completed or Cancelled: "This job can no longer be edited (it's completed or cancelled)." Both have a link back to the job.
- Clearing a Bangla title or "includes" text that was saved before clears it. Empty text that was never saved is not sent.
- After saving, the buyer returns to the job page.

### 5.6 What other buyers can see

A buyer sees **only their own jobs**. Another buyer's job address shows "We couldn't find that job." with a link "Back to my jobs". The edit address does the same.

## 6. Test cases

Mark each case Pass or Fail. Keep a screenshot for each Fail.

### 6.1 Access

| ID | Steps | Expected |
|---|---|---|
| JB-01 | Logged out, open `/buyer/jobs` | Sent to login (`next=/buyer/jobs`); after login you return |
| JB-02 | Logged out, open `/buyer/jobs/new`, `/buyer/jobs/5`, `/buyer/jobs/5/edit` | Same: login first, then back |
| JB-03 | Logged out, click the header "Jobs" | Login page |
| JB-04 | Logged in, click the header "Jobs" | My jobs |
| JB-05 | Phone width, open the side menu | "My Jobs" is there and works |
| JB-06 | Use a seller or admin login on the buyer jobs address | No buyer data is shown. A buyer login is required |

### 6.2 Posting

| ID | Steps | Expected |
|---|---|---|
| JB-10 | New buyer opens My jobs | "You haven't posted a job yet" and "Post your first job" |
| JB-11 | Post a job with title, description, category, **no budget** | Server message "A job needs at least one budget option." under the budget section. Nothing is saved. Typed data stays |
| JB-12 | Post with one fixed budget option | Lands on the job page. Status "Open for bids" at once |
| JB-13 | Check the job in My jobs | It is the first row; budget and "0 bids" are right |
| JB-14 | Post with no title | Error near the title (server message) |
| JB-15 | Post with no description | Error near the description |
| JB-16 | Post without choosing a category | Error is shown (server message) and nothing is saved |
| JB-17 | Open the category drop-down | Only service categories (no product categories) |
| JB-18 | Choose a category with sub-categories | A second drop-down appears; choose again; the deepest is used |
| JB-19 | Choose a deep category, then change the first drop-down | Lower drop-downs go away; the new choice is used |
| JB-20 | Two rows, both "Fixed price" | Warning "Two budget options use the same price type…"; nothing sent |
| JB-21 | Add rows until all five types are used | The "Add another budget option" button disappears |
| JB-22 | Add a row then "Remove this option" | Row removed. With one row left, the remove link disappears |
| JB-23 | Budget price 0, negative, letters, very large | Browser or server refuses with a clear message; no crash |
| JB-24 | Budget with decimals (1500.50) | Saved and shown as 1500.50 ৳ |
| JB-25 | Fill Bangla fields | Saved; visible when editing |
| JB-26 | Needed within: 0, -1, 2.5 | Refused or corrected; no crash |
| JB-27 | Urgent ticked | Urgent badge on the list and on the job page |
| JB-28 | Dates: "to" earlier than "from" | Server message near the dates (if the server refuses); no crash |
| JB-29 | Location: choose all four levels | Saved; changing country empties the rest |
| JB-30 | A district with no thanas | Thana list empty; saving works |
| JB-31 | Very long title (300+ letters) | Server message or accepted; no crash |
| JB-32 | Special characters and emoji in title and description | Saved and shown correctly (no broken symbols) |
| JB-33 | Double click **Post job** | Only one job is created |
| JB-34 | Press Cancel | Back to My jobs; nothing saved |
| JB-35 | Reload the form half filled | Empty form (drafts are not kept). This is expected |

### 6.3 My jobs list

| ID | Steps | Expected |
|---|---|---|
| JB-40 | Post 12 jobs | Page 1 has 10, page 2 has 2. Pager works |
| JB-41 | Order | Newest first |
| JB-42 | Status filter for each status | Only that status |
| JB-43 | Search a word in a title | Only matching jobs |
| JB-44 | Search a word only in a description | The job is found |
| JB-45 | Search with no match | "No jobs match this search." and the Clear button |
| JB-46 | Press Clear | Filters and search are removed |
| JB-47 | Change the filter on page 2 | Goes to page 1 |
| JB-48 | `?page=99` | "There are no more jobs to show." and "Back to the first page" |
| JB-49 | `?page=abc`, `?page=0` | Page 1 |
| JB-50 | Copy the URL with filters into a new tab | Same list and same values in the form |
| JB-51 | Use Back after a filter | Previous list returns |
| JB-52 | Bid count | Counts all bids, including rejected and cancelled |
| JB-53 | Job with no active budget | Budget says "none set" |
| JB-54 | Click a row | Job page opens |
| JB-55 | Stop the backend and reload | Red error message, no endless "Loading…" |

### 6.4 Edit

| ID | Steps | Expected |
|---|---|---|
| JB-60 | Open Edit on an Open job | All values are filled in. Category name shown with "Change category" |
| JB-61 | Add a second budget option (Hourly 400) and save | Both options shown; the first one is unchanged |
| JB-62 | Check what was sent (browser network tab) | Only the new option is in the request; the unchanged saved option is not |
| JB-63 | Change the price of a saved option | That option has the new price; others unchanged |
| JB-64 | Try to remove a saved option | There is no remove link on a saved row |
| JB-65 | Change the type of a saved option to one already used | Warning; nothing sent |
| JB-66 | Change only the title | Saved; budget and everything else unchanged |
| JB-67 | Change category | New category shown after saving |
| JB-68 | Clear the Bangla title that was saved | It is cleared |
| JB-69 | Remove the date that was saved | The date is cleared |
| JB-70 | Edit a **Paused** job | Allowed; saves fine; the job stays Paused |
| JB-71 | Edit a **Reopening** job (if you can get one) | Allowed |
| JB-72 | Open edit of an **In progress** job | Message "This job has been hired…" with a link back. No form |
| JB-73 | Open edit of a **Completed** or **Cancelled** job | Message "This job can no longer be edited…" |
| JB-74 | Hire a bid in another tab while the edit form is open in this tab, then save | The server refuses; a clear red message shows; nothing changes |
| JB-75 | Save with an error (empty title) | Message near the field; typed data stays |
| JB-76 | Cancel on the edit form | Back to the job page, nothing saved |
| JB-77 | `/buyer/jobs/abc/edit`, `/buyer/jobs/0/edit` | 404 page |

### 6.5 Pause, reopen, cancel

| ID | Steps | Expected |
|---|---|---|
| JB-80 | Press Pause on an Open job | Status "Paused". Buttons: Edit, Reopen, Cancel job |
| JB-81 | Check the Seller website job board | The paused job is no longer offered for bidding |
| JB-82 | Press Reopen | Status "Open for bids". Edit, Pause, Cancel job shown |
| JB-83 | Press Cancel job, then "Keep it" | Nothing changes |
| JB-84 | Press Cancel job, then "Yes, cancel the job" | Status "Cancelled". No buttons. |
| JB-85 | Cancel a job that has two pending bids | Both bids now show **cancelled** (not rejected) |
| JB-86 | Cancel a **Paused** job | Works |
| JB-87 | Cancel a job that has a lost (rejected) bid earlier | That old bid stays as it was |
| JB-88 | Cancelled job: open the edit address | "This job can no longer be edited…" |
| JB-89 | Double click Pause or Cancel | One change; no error |
| JB-90 | Pause in tab 1; in tab 2 (still showing Open) press Pause | A red message from the server, and the page refreshes to the true status |
| JB-91 | An admin pauses or changes the job; the buyer presses a button on an old screen | A clear red message; page refreshes to the true status |

### 6.6 Bids and hiring

| ID | Steps | Expected |
|---|---|---|
| JB-100 | Open a job with no bids | "No bids yet. Sellers who bid will show here." |
| JB-101 | A seller places a bid; reload the job | The bid shows with name, status "pending", message, price option(s), dates. Accept button is there |
| JB-102 | Two sellers bid | Two bids, newest first. "Bids (2 placed)" |
| JB-103 | Bid status filter: Pending / Accepted / Rejected / Cancelled | Only matching bids; "No bids with this status." when none |
| JB-104 | 11+ bids | Pager appears; page 2 works |
| JB-105 | A bid with an hourly option, duration 8, price 100 | Shown as "100 ৳ / hour × 8 = 800 ৳" |
| JB-106 | Accept a one-option bid | Green box: "<name> is hired. Order #… is in progress, payable …". Job status "In progress" |
| JB-107 | After JB-106 | Only **Mark complete** remains. No Edit, Pause, Cancel job, Reopen and no Accept buttons |
| JB-108 | After JB-106, the other pending bid | Status **rejected** |
| JB-109 | After JB-106, the accepted bid | Status **accepted** |
| JB-110 | Reload after hiring | Green box is gone; blue line "Hired: <name>" shows; statuses stay right |
| JB-111 | Check the order amount | Equals the price of the accepted option (price × duration) |
| JB-112 | Accept a two-option bid | Radio buttons and the text appear; **Accept this option** is off |
| JB-113 | Choose an option and press **Accept this option** | Hired; the chosen option has "Hired option" |
| JB-114 | Press **Back** on the option choice | The choice closes; nothing sent |
| JB-115 | Two two-option bids | Each has its own choice; choosing in one does not change the other |
| JB-116 | Pause the job, open its bids | Bids are visible but **no Accept buttons** |
| JB-117 | A job with bids that was cancelled | All bids "cancelled"; no Accept buttons |
| JB-118 | A seller **cancels** their own bid, then reload | Bid shows cancelled; no Accept button for it |
| JB-119 | A seller edits their bid (new price) and the buyer reloads | The new price is shown |
| JB-120 | The seller cancels the bid between the buyer's page load and the click on Accept | A red message ("Only a pending bid can be accepted." or similar) and the page refreshes with the true status |
| JB-122 | Accept the same bid in two tabs | The second tab shows a red message (job is not open); page refreshes |

### 6.7 Mark complete

| ID | Steps | Expected |
|---|---|---|
| JB-130 | In progress job: press **Mark complete**, then **Not yet** | Nothing changes |
| JB-131 | Press **Mark complete**, then **Yes, it is complete** | Status "Completed"; no buttons |
| JB-132 | Check list and bids after completing | List shows Completed. The accepted bid stays accepted |
| JB-133 | Mark complete is shown on an Open job? | No. Only In progress shows it |
| JB-134 | Try to edit a completed job (address) | "This job can no longer be edited…" |
| JB-135 | An admin cancels the hired job; the buyer then opens the job | Status "Cancelled"; the admin's note (if any) is shown in the blue box |
| JB-136 | Admin reopens (rejects the hire) and the job is Open again | The buyer sees Open for bids and the bid statuses as the server says |

### 6.8 Other buyers and bad addresses

| ID | Steps | Expected |
|---|---|---|
| JB-150 | Buyer 2 opens Buyer 1's job address | "We couldn't find that job." and the "Back to my jobs" link |
| JB-151 | Buyer 2 opens Buyer 1's job edit address | Same message. No form |
| JB-152 | Buyer 2's My jobs | Shows only Buyer 2's jobs |
| JB-153 | `/buyer/jobs/999999` | "We couldn't find that job." |
| JB-154 | `/buyer/jobs/abc`, `/buyer/jobs/0`, `/buyer/jobs/-1` | 404 page |
| JB-155 | Buyer 2 tries the bids of Buyer 1's job by calling the server (QA with API tools) | 404 |
| JB-156 | Seller login on the bids server call | 403 |
| JB-157 | No login on the server calls | 401 |

### 6.9 General checks

| ID | Steps | Expected |
|---|---|---|
| JB-170 | Browser console on all job pages | No red errors |
| JB-171 | Phone width on every job page | No sideways scrolling; buttons usable; bids readable |
| JB-172 | Back and Forward through list, job and edit | Each step shows the right page |
| JB-173 | Slow network | "Loading…" then data; buttons off during actions |
| JB-174 | Stop the backend during an action | A red message "Something went wrong. Please try again." The page stays usable |
| JB-175 | Session expires during an action | Sent to login; no crash |
| JB-176 | Dates shown | Shown like "3 Nov 2026" |
| JB-177 | Prices | Shown in taka like `1500 ৳` |

## 7. Corner cases to try on purpose

- Post a job, pause it, edit it, reopen it, get a bid, accept it, complete it. Check the status and buttons after every step.
- Post two jobs with the same title. Both are kept. Each has its own page.
- A job with all five budget types. The list shows the **cheapest active** one as the budget.
- Make a budget option inactive from the admin site; the buyer page hides it from the Budget list, and the list budget moves to the next cheapest.
- A seller bids with an hourly and a fixed option. The buyer accepts the fixed one; check the order amount. Repeat with the hourly one.
- Many bids from many sellers. Accept one on page 2 of the bids.
- A seller whose account becomes suspended after bidding. Their bid still shows; accepting may be refused with a message.
- Cancel a job right after a seller placed a bid (race). The bid ends cancelled.
- Open the job page while the job has just been hired by an admin. Reload shows the true state.
- Use the browser Back button after hiring. The page must show the current state, not an old one.
- Open a job with a very long description. It wraps; no layout break.
- Bangla text in all text fields.

## 8. Known gaps (not bugs; do not report)

1. There is **no Orders page** yet. The order number is visible only in the green box right after accepting.
2. A saved budget option **cannot be removed** by the buyer (the server has no remove call). A new row can be removed before saving.
3. Messages, Notifications, Orders and Profile links in the header go to pages that are not built yet.
4. The old "Projects" page (`/buyer/projects`) is not built. Jobs replace it in practice.
5. There is no sign-out button in the buyer header yet.
6. The word shown for a bid status is the plain server word (pending, accepted, rejected, cancelled).

## 9. How to report a bug

Write: the test ID, which buyer, the job number, the job status before and after, the full address, the exact steps, what you expected, what you saw, a screenshot, and the red message text if there was one. For hiring problems, also note which seller placed the bid, how many options the bid had, and the order number if one was shown.
