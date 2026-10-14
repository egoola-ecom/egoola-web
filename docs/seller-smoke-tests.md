# Seller Web: smoke tests

Phase 3, Seller Web, rows 7 and 8 of the Phase Tracker. Run on 2026-10-14 in a real
browser (Chrome driven by a script) against a local backend with a throwaway database.
Pages tested: `/seller`, `/seller/profile`, `/seller/password`, `/seller/listings`,
`/seller/gigs` and their create, detail and edit pages. The listing and gig screens
were tested case by case in `docs/listing-audit.md` (27 browser cases, all Pass); this
file covers the rest of the seller area and the lock rules around it.

Test sellers, one per state: unverified, pending, rejected, paused (verified but
inactive), suspended, and verified and active.

## 1. Access by seller state

| ID | Case | Expected | Result |
|---|---|---|---|
| SW1 | Unverified seller logs in and opens `/seller` | Sent to My profile; banner "under review"; tabs are only My profile and Password | Pass |
| SW1b | Same seller opens `/seller/listings` | Locked page, no table | Pass |
| SW1c | Same seller opens `/seller/gigs/new` | Locked page | Pass |
| SW2, 2b, 2c | Pending seller: the same three checks | Same as SW1 | Pass |
| SW3 | Rejected seller opens My profile | Rejected banner with a "Fix and resubmit" link; resubmit card shown | Pass |
| SW3b | Rejected seller resubmits with a note | Banner changes to "under review"; resubmit card disappears | Pass |
| SW4 | Paused seller (verified, inactive) | Banner says paused (not "under review"); tabs are only My profile and Password | Pass |
| SW4b | Paused seller opens `/seller/listings` | Locked page with the paused text | Pass |
| SW5 | Suspended seller logs in | Refused (401) | Pass |
| SW6 | Verified and active seller opens `/seller` | No banner; tabs Dashboard, Listing, My profile, Password | Pass |
| SW7 | Click the Listing tab | Opens Product; second row shows Product and Gigs | Pass |
| SW8 | Click the Gigs sub tab | Opens `/seller/gigs` | Pass |
| SW16 | No session, open `/seller` | Sent to `/login` | Pass |

## 2. My profile

| ID | Case | Expected | Result |
|---|---|---|---|
| SW9 | Open My profile | Details form and Documents card; no resubmit card | Pass |
| SW10a | Open the profile of a seller whose addresses are empty in the database | No React warning in the console | Pass (after fix, see Bugs) |
| SW12 | Clear the name and save | "Name cannot be blank."; nothing sent to the server | Pass |
| SW10 | Fill both addresses, country, state, city and save | Only the changed fields are sent (one PATCH); "Profile saved." | Pass |
| SW11 | Reload | New name and address are kept; the top bar shows the new name | Pass |
| SW10b | Save with nothing changed | "There is nothing to save: no field was changed." | Pass |

## 3. Documents (KYC)

| ID | Case | Expected | Result |
|---|---|---|---|
| SW17 | Save documents with nothing added or removed | "Nothing to change" message | Pass |
| SW17b | Add an NID (PNG) and save | "Documents saved."; a tile appears | Pass |
| SW19 | Add an extra document of another kind and save | Saved; tile count goes up | Pass |
| SW20 | Remove the extra document and one of two NIDs, save | Saved; one NID is left | Pass |
| SW21 | Press Replace on the last NID and save without a file | Refused: "Choose a file, or remove this row." | Pass |
| SW22 | Replace the last NID with a new file | Saved; one NID is left | Pass |
| SW23 | Verified seller opens Documents | Identity documents are marked Locked | Pass (seen on SW9 screenshot) |

## 4. Password

| ID | Case | Expected | Result |
|---|---|---|---|
| SW13 | Wrong current password | "Incorrect password." | Pass |
| SW14 | New password and repeat do not match | Refused on the page | Pass |
| SW15 | Correct change | "Password changed."; stays signed in; login works with the new password | Pass |

## 5. Theme and layout

| ID | Case | Expected | Result |
|---|---|---|---|
| SW24 | Colours and font | Active tab and buttons use the brand greens (`#2cb776`, `#2cd083`); Geist font; seller styles use the shared `--brand-*` tokens | Pass |
| SW25 | Page width 390, 768 and 1300 px on seven seller pages | No horizontal page scroll | Pass |
| SW26 | `npm run ci` (lint, types, build) | Passes | Pass |

## Bugs found while testing

1. **Seller profile read empty addresses as `null`.** A seller with no saved address
   (created by an admin or the seed script) made React warn that a textarea value was
   `null`, and a blank address was compared against `null`. The form now treats a missing
   address as an empty string. Fixed and re-tested (SW10a, SW10).

## Notes for the backend team (not changed here)

- The seller documents endpoint accepts a plain text file named `.png`. The listing
  image upload rejects the same file with "not a valid image". Documents are checked by
  file name and type only.
- The seller profile API can return `null` for `present_address` and `permanent_address`
  although the guide shows plain text.
