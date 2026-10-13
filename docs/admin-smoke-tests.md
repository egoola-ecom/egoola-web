# Admin Web — smoke tests (Phase 2)

Every case below was run by hand in the browser against the real backend
(`egoola-server`, `http://localhost:8000`), with the Next.js dev server on
`http://localhost:3000`. Test records were named `SMOKE …` and deleted afterwards.

- Accounts: `test.admin@egoola.com` (plain admin) and `test.super@egoola.com`
  (super-admin), password `Test@12345` (`egoola-server/docs/test-accounts.md`).
- Result column: **Pass** = behaved as expected. A bug that was found and fixed is listed
  in "Bugs found" at the bottom.
- Not covered by this list: the Admin Dashboard data API and Financial oversight
  (the backend has no API for them yet — see the end).

## 1. Login and session

| ID | Case | Expected | Result |
|---|---|---|---|
| L1 | Wrong password | Stay on login, "Invalid email or password." | Pass |
| L2 | Unknown email | Same message | Pass |
| L3 | A buyer/seller account on the admin login | Same message | Pass |
| L4 | Plain admin, correct password | Dashboard; session has `admin_type: admin` | Pass |
| L5 | Log out | Session removed, back on login | Pass |
| L6 | Open a protected page without a session | Redirect to login | Pass |
| L7 | Super-admin login | Session has `admin_type: super_admin` | Pass |
| L8 | Access token expired (made invalid by hand) | Refreshed silently; the new refresh token is stored; 9 parallel calls share one refresh | Pass |
| L9 | Admin deactivated while signed in | Next request: session cleared, redirect to login | Pass |

## 2. Dashboard (interim)

| ID | Case | Expected | Result |
|---|---|---|---|
| D1 | Plain admin | 8 tiles with counts; each links to the matching list (listings links carry `?status=`) | Pass |
| D2 | Plain admin menu | No "Admins" item and no Admins tile | Pass |
| D3 | Interim note | The "interim dashboard" text is shown | Pass |
| D4 | Super-admin | "Admins" in the menu and an Admins tile (4) | Pass |

## 3. Sellers

| ID | Case | Expected | Result |
|---|---|---|---|
| S1 | List | Loads with pagination text | Pass |
| S2 | Search: no match / match | "No sellers found." / 1 row | Pass |
| S3 | Filter by verification status | Verified → none, Unverified → 1 | Pass |
| S4 | Filter by account status (suspended) | None | Pass |
| S5a | Create with an existing email | Field error on email | Pass |
| S5b | Create with a very common password | Field error on password | Pass |
| S5c | Valid create | Row appears | Pass |
| S6 | Details page | Header, verification panel, profile sections | Pass |
| S7 | Update page: change name, save | Returns to details with the new name | Pass |
| S8a | Reject without a note | Blocked (note is required) | Pass |
| S8b | Reject with a note | Status Rejected, history row added | Pass |
| S8c | Back to Verified | History has 3 rows | Pass |
| S9 | Delete | Row removed | Pass |

## 4. Buyers

| ID | Case | Expected | Result |
|---|---|---|---|
| B1 | List | Loads | Pass |
| B2 | Search: no match / match | Empty state / 1 row | Pass |
| B3 | Status filter (suspended) | None, then shows the suspended test buyer (B3b) | Pass |
| B4 | Email verified / phone not verified filters | None / 1 row | Pass |
| B5 | Signed-up-from 2099 / 2020, then Clear filters | None / 1 row / filters reset | Pass |
| B6 | Location filter present (country→thana) | Selects shown | Pass |
| B7a–b | Create with existing email / existing phone | Field error on that field | Pass |
| B7c | Password with digits only | Blocked by the form | Pass |
| B7d | Very common password | Server error on password | Pass |
| B8 | Valid create | Row appears | Pass |
| B9 | Details | Profile, wallet, location | Pass |
| B10 | Edit name + status + location | PATCH carries only name, status and the four location ids | Pass |
| B11 | Clear the location, save | Location sent empty, details show "—" | Pass |
| B12 | Delete | Row removed | Pass |
| B13 | Save with no changes | No request sent, returns to details | Pass |

## 5. Admins (super-admin only)

| ID | Case | Expected | Result |
|---|---|---|---|
| A1 | List | 4 admins | Pass |
| A2 | Filters: type, status, search | Correct counts / empty state | Pass |
| A3 | Create: role options | Only Super Admin and Admin | Pass |
| A3a–b | Existing email / existing mobile | Field error | Pass |
| A3c | Very common password | Field error | Pass |
| A3d | Valid create | Row appears | Pass |
| A4 | Own row | "(you)" shown, no Delete button | Pass |
| A5 | Own edit page | Type and Status are disabled; saving with no change sends nothing | Pass |
| A6 | Promote + deactivate another admin | PATCH has only type and status | Pass |
| A7 | Deactivated admin tries to log in | Refused (403) | Pass |
| A8 | Delete another admin | Row removed | Pass |
| A9 | Plain admin: API and screen | API 403 with the server message; screen shows "Only a super-admin can access Admin Management."; no menu item | Pass |

## 6. Geography

| ID | Case | Expected | Result |
|---|---|---|---|
| G1 | Search: no match / match | Empty state / 1 row | Pass |
| G2 | Create country; duplicate name | Created; field error "already exists" | Pass |
| G3 | Edit country | Name changes | Pass |
| G4 | States tab list and form | Country select shown | Pass |
| G5 | Create state | Row shows its country | Pass |
| G6 | Create city (state list only offers the chosen country's states) | Created | Pass |
| G7 | Create thana (country → state → city chain) | Created | Pass |
| G8 | Delete a country that has children | Children are deleted too (backend cascade) | Pass |
| G9 | Delete confirm text (after the fix) | Country/state/city dialogs say that everything under them is deleted too | Pass |

## 7. Catalog

### Categories

| ID | Case | Expected | Result |
|---|---|---|---|
| C1 | Product and Service lists | 11 / 9 rows | Pass |
| C2 | Search: no match / match | Empty / 1 row | Pass |
| C3 | Status filter (inactive) | Empty | Pass |
| C4a | Duplicate name in the same type | Field error | Pass |
| C4b | Create | Row appears | Pass |
| C5 | Rename and set inactive | Row shows Inactive | Pass |
| C6 | Inactive category on the listing form | Greyed and cannot be chosen | Pass |
| C7 | Delete a category used by a listing | Server's 409 message + "Deactivate instead" | Pass |
| C8 | Delete an unused category | Row removed | Pass |

### Measurements and Brands

| ID | Case | Expected | Result |
|---|---|---|---|
| M1–M2 | List, search with no match | Loads / empty state | Pass |
| M3 | Create; duplicate name | Created / field error | Pass |
| M4–M5 | Edit; delete | Updated / removed | Pass |
| BR1–BR2 | Brand list; inactive filter | Loads / empty | Pass |
| BR3 | Create; duplicate name in a different letter case | Created / field error | Pass |
| BR4 | Deactivate | Shows Inactive | Pass |
| BR5 | Delete an unused brand | Removed | Pass |
| BR6 | Delete a brand used by a listing | 409 message + "Deactivate instead" | Pass |

### Attributes and values

| ID | Case | Expected | Result |
|---|---|---|---|
| AT1–AT2 | List; inactive filter | 7 / 1 | Pass |
| AT3 | Search in Bangla | Finds Colour | Pass |
| AT4 | Duplicate attribute name | Field error | Pass |
| AT5 | Duplicate value name in one attribute | Field error | Pass |
| AT6 | Deactivate a value | Shows Inactive | Pass |
| AT7 | Delete an unused value | Removed | Pass |
| AT8 | Delete an unused attribute | Removed | Pass |
| AT9 | Delete an attribute used by a SKU | 409 message + "Deactivate instead" | Pass |
| AT10 | Delete a value used by a SKU | 409 message + "Deactivate instead" | Pass |

### Listings

| ID | Case | Expected | Result |
|---|---|---|---|
| LI1 | List | 13 listings, one page | Pass |
| LI2 | Status filters | Draft 0, Pending 4, Approved 7, Rejected 1, Changes requested 1 | Pass |
| LI3 | Catalog type, format, brand filters | Correct rows | Pass |
| LI4 | Search by SKU code | Finds the listing; price column shows the "From" price | Pass |
| LI5 | `?tab=listings&status=pending` link | Status filter preselected | Pass |
| LI6 | Create without a category | "Pick a category for this listing." | Pass |
| LI7 | Create with options (Colour × 2), discount, tier, brand, location, image | One JSON create, then one multipart for the image; detail shows everything | Pass |
| LI7b | Create with one price | `skus` carries one item with price, discount, stock | Pass |
| LI8 | Duplicate SKU code on edit | Error shown on that SKU's card only | Pass |
| LI9 | Edit: change one SKU code, deactivate another | Only changed fields + `id` sent; inactive SKU greyed | Pass |
| LI9b | Save an edit with no SKU change | `skus` is not sent | Pass |
| LI10 | Moderation: request changes / reject without a note | Blocked with a message | Pass |
| LI10b | Request changes, reject, approve, move to pending (with notes) | Status, latest note and 5 history rows correct | Pass |
| LI10c | Approve when already approved | Button disabled | Pass |
| LI11 | Bulk: approve; approve again; reject (note required) | "1 updated"; "0 updated, 1 skipped (already approved)"; "1 updated" — each names the listing | Pass |
| LI12 | Inactive category | Cannot be picked | Pass |
| LI13 | "Brand" format without a brand | Brand field is required; save blocked | Pass |
| LI14 | Location chain | State list follows the country; city list follows the state | Pass |
| LI15 | Image upload; remove image | Added / removed | Pass |
| LI16 | Delete from the list; delete from the details page; open the deleted listing | Gone; "doesn't exist any more" message | Pass |
| LI17 | Price tier on create / on edit | Create: no "applies to" box. Edit: pick one of the SKUs; the details page shows it | Pass |

## 8. CMS

| ID | Case | Expected | Result |
|---|---|---|---|
| CM1–CM2 | Banner filters: placement, status, live-now; search with no match | Correct counts / empty state | Pass |
| CM4 | Create a banner without an image | "A banner needs an image." | Pass |
| CM5 | Create a hero banner scheduled in the past | Shows "Expired" | Pass |
| CM6 | Edit: new heading, clear the schedule, switch to sidebar | Shows "Live"; category picker only for sidebar | Pass |
| CM7 | Delete banner | Removed | Pass |
| ET1–ET5 | Email templates: list, create, duplicate key, key read-only on edit, edit, delete | All as expected | Pass |
| SE1 | Setting with invalid JSON | Explained message, nothing sent | Pass |
| SE2 | Create; duplicate key | Created / field error | Pass |
| SE3 | Reserved key `site_logo_url` | "managed by the site-logo endpoint" | Pass |
| SE4–SE5 | Edit (key read-only); delete | Updated / removed | Pass |
| SE6 | Logo settings rows | Show "Managed in Site Logo", no actions | Pass |
| LG1 | Upload a text file as the logo | Server message "Upload a valid image…" | Pass |
| LG2 | Replace the logo | New logo shown | Pass |
| LG3 | Remove the logo | "No logo set" | Pass |
| LG4 | Upload again | Logo restored (the original image was put back after the test) | Pass |

## 9. Django Admin (secondary, internal tool)

| ID | Check | Result |
|---|---|---|
| DJ1 | `/admin/` redirects to its own login page (`/admin/login/` answers 200) | Pass |
| DJ2 | 36 models are registered; the 5 own models that are not (`ListingSkuVariant`, `ListingPriceTier`, `ListingMedia`, `CartItem`, `OrderItem`) are shown as inlines inside their parent | Pass |
| DJ3 | The web app never links to or calls Django Admin | Pass |
| DJ4 | Login is by Django's own staff accounts (1 superuser exists), separate from the panel's JWT logins | Pass |

## Bugs found while testing

1. **Geography delete dialogs did not warn about cascading deletes.** Deleting a country,
   state or city silently deletes everything under it (documented backend behaviour).
   The confirmation now says so. Fixed and re-tested (G9).

## Notes for the backend team (not changed here)

- Dashboard data API and financial oversight (withdrawals, refunds, commission) do not exist yet.
- A seller created by an admin is saved as **Verified** straight away (S5c).
- Duplicate-field messages say "user with this email already exists" for buyers (the model name).
- Soft-deleted listings keep their slug and SKU codes (documented), so test listings leave rows behind.
- Django Admin is reachable at `/admin/` on the same host as the API. Consider restricting it
  in production (for example by network or a non-default path).

## Not covered

- Admin Dashboard from real data, and Django Admin dashboard (backend API missing).
- Financial oversight screens (backend API missing).
- Phone-width layout and other browsers: tested on a desktop browser only.
