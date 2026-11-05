# Admin Seller management: cross-check against the brief

Brief: `egoola-server/docs/prompt/admin/seller-management.md` and `admin/seller-verification-guide.md`. Checked in real Chrome and by calling every endpoint, as the plain admin `test.admin@egoola.com`, on throwaway sellers that were deleted afterwards. The two gaps found were fixed afterwards (see "After the fixes").

## Brief versus what is built

| Brief item | Built | Result |
|---|---|---|
| Any admin may use it (401 no token, 403 seller/buyer) | `/admin/sellers` is open to a plain admin | Pass. API: 401 and 403 |
| List with filters and paging | Search; filters for verification status, account status, who created the account, business profile, business type, created date range, requested date range, and country/state/city/thana, and (added after this audit) Seller Request queue, email verified and phone verified. Columns: Name, Phone, Verification, Status, Wallet, Signed up | Pass |
| Seller Request queue (cursor paged, newest first, sort choice) | Seller Requests page with a sort control, "Load more", no total. Columns: Seller, Phone, Verification, Status, Requested | Pass. Newest request first, and the sort change reverses it |
| Menu badge from `is_seller_request=true` | Count shown beside Sellers and Seller Requests | Pass |
| Create (JSON or multipart) | Add Seller dialog: profile, address and location, skills, experience, education, business profile, documents | Pass. An admin-created seller is verified and not a request, as the guide says |
| Retrieve (full record) | Seller detail page: Review panel, Documents, Profile, Profile change history | Pass |
| Update (PATCH) | Update page. The phone field warns that it is the seller's login number | Pass |
| Delete, 409 when the seller has an order | Delete with a confirm. A refusal now shows the server's reason with Deactivate instead and Suspend instead (added after this audit) | Pass |
| Approve (verified + active in one request) | **Approve** button with a confirm | Pass: one request set both |
| Reject needs a note | **Reject…** opens a note box. An empty note: "A note is required when rejecting." Nothing changes | Pass |
| Reactivate / Pause / Suspend | Pause (inactive), Activate, Suspend buttons. Mark pending | Pass |
| Leaves the queue on a real status change, stays on other edits | Handled sellers disappear from the queue. An address edit keeps the seller queued | Pass (API) |
| Verification history | In the Review panel, with each note | Pass |
| Profile change history (before and after) | "Profile change history" card | Pass. A business profile edit shows the before and after, by admin |
| Business profile (`info`, JSON string over multipart) | Business profile section in the form | Pass. All six required fields must be filled, else the server lists the missing ones |
| Profile picture set and remove | Choose, Replace, Remove photo with Undo | Pass |
| Documents add and remove, six kinds (nid, birth_certificate, certificate, gallery_image, gallery_video, other) | Documents section with all six kinds | Pass. All six accepted by the server |
| 2 MB picture, global file limits | Checked at pick time | Pass |

## Live results

API: all pass. Self-registered seller starts unverified, inactive and in the queue. Queue is cursor paged and a broken cursor answers 404. Reject without a note answers 400. Re-verifying without a note clears the note, and re-sending the same status writes no log row. Approve then login works, and suspend blocks login. Every filter in the brief works and they combine. Business profile and change log, picture set and remove, six document kinds added and removed, and the phone can be changed by an admin. Deleting a seller with an order answers 409 with a clear reason, and a seller with no order deletes (204).

Screen: all pass except the delete message. No page errors.

## Gaps

1. **A refused delete loses its reason.** When a seller has an order, the server answers 409 "This seller has one or more orders. Deactivate or suspend the account instead of deleting." The screen shows only "Couldn't delete this seller. Please try again.", so an admin retries in vain and is not told to deactivate or suspend. Brands, categories and attributes already show the server's reason with a "Deactivate instead" button. The fix is small.
2. **Three list filters in the brief are not on the screen:** `is_seller_request` (in the queue or not), `email_verified` and `phone_verified`. The server supports them. The last two are always false until the OTP feature exists, so they are low value. `is_seller_request` is covered by the Seller Requests page.

## Notes

- Delete uses a browser confirm dialog for the first question.
- Not tested in the browser: an admin editing a seller's documents on the Update page, the resubmit flow from the seller's side, and a seller seeing their NID locked after approval.

## After the fixes

1. **Refused delete.** When the server answers 409 (the seller has orders), the page keeps the server's reason in a red bar with **Deactivate instead**, **Suspend instead** and **Dismiss**. Each button changes the seller's status and refreshes the list and the menu badge. The button for the status the seller already has is left out. Other failures show the server's message instead of a browser alert. A seller with no orders still deletes.
2. **Filters.** The sellers list now has "Seller Request queue" (any, in the queue, not in the queue), "Email verified" and "Phone verified". They are on the Sellers list only, not on the queue page. Email and phone verified are always "not verified" until the OTP feature exists, so "verified" returns no sellers today.

Checked in Chrome: the reason text, the three buttons, Deactivate and Suspend taking effect, Dismiss, a no-order seller deleting normally, each new filter against the API count, Clear filters, and no page errors. `tsc` and `eslint` are clean.

## Update for the new verification rules

The verification guide changed (`seller-verification-guide.md`, "Transition and status rules"). The Review panel and the edit form follow it. The server stays the authority; the screen switches off a choice it knows will be refused and says why.

**The rules**
1. A **Rejected** seller can only move to **Pending**.
2. A seller who has **ever been Verified** can never be **Rejected**. The server now sends the read-only `was_ever_verified` flag on the detail response (not on the list) and the screen uses it. If an older server does not send it, the screen falls back to the history: any past Verified entry.
3. The account status follows the verification status: **Pending** forces Inactive, **Rejected** forces Suspended, **Unverified** cannot be Active, **Verified** is free.

**Button names now match the statuses exactly**
- Verification: **Unverified, Pending, Verified, Rejected**.
- Account status: **Active, Inactive, Suspended**.
- The old Approve, Reject…, Mark pending, Pause, Activate and Suspend are gone, and so is the "Set the verification status by hand" panel. The word "paused" no longer appears. The status badges, the list, the queue, the history and the notices use the same words.

**How it behaves**
- The current statuses are shown as badges and their buttons are off.
- A verification button opens a small form: a note (required for Rejected), a line saying what the account status becomes (Pending gives Inactive, Rejected gives Suspended, Unverified while Active gives Inactive), and for Verified a ticked box "Also set the account status to Active" (the old Approve did both in one request).
- Buttons the rules forbid are off with a tooltip, and the reasons are written under the buttons: "A Rejected seller can only be moved to Pending next.", "A seller who has ever been Verified can never be Rejected.", "While the verification is Pending the account is Inactive.", "While the verification is Rejected the account is Suspended.", "An Unverified seller cannot be Active."
- The edit form lists only the account statuses the rules allow, and a hint explains why. A Rejected seller's save keeps Suspended, so nothing changes by accident.

**Checked** against the live server and in Chrome (about 40 checks, all matching the rules; two test-script mistakes were fixed). `tsc` and `eslint` are clean.

**A contradiction in the guide, for the backend.** The "fix and resubmit" section still says a rejected seller keeps Inactive and can log in. Under the new rule a Rejected seller is **Suspended**, and a live login answers 401 "This account is not active.", so they cannot reach Resubmit. The only way back is an admin moving them to Pending (account becomes Inactive, login works again). The Review panel now says so for a Rejected seller. The seller site's "send your application again" text for a rejected seller cannot be reached until the backend decides which rule wins.

## Update for the login and access tiers

The guide now says every account status can log in. The status decides what a seller can do after login, in three tiers reported by `can_operate` and `can_edit_profile`: Full (both true), Profile-only (only `can_edit_profile`), and Locked (both false).

Changes in the web app:

1. The admin Review panel shows an Access badge (Full access, Profile only, Locked) and a sentence about it. The old note that a Rejected seller cannot log in is gone. It now says a Rejected seller can log in, fix their profile and press Resubmit.
2. The Inactive and Suspended confirmations say a Verified seller becomes fully locked, and any other seller keeps profile-only access.
3. `SellerDetail` and `SellerMe` carry `can_operate` and `can_edit_profile`. The seller session keeps `can_edit_profile` in step with the server.
4. In the seller app, a Verified seller who is Inactive or Suspended sees a paused or suspended banner, and the profile and documents pages are read-only. A Rejected seller keeps the Fix and resubmit banner and can edit.

Checked in Chrome against the live server: the tier badge for a Rejected, a Verified and Inactive, a Verified and Suspended, and a Verified and Active seller, and the seller login (200 for all four) with the matching banner and read-only profile.

Not tested in the browser: pressing Resubmit and the admin queue showing the seller again at the top.
