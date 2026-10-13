# Listings / Gigs audit (Admin and Seller panels)

Source checklist: `egoola-server/docs/frontend-listing-audit-prompt.md`. Evidence is `file:line` in `egoola-web` (`A:` = `src/app/(admin)/admin/(protected)/`, `S:` = `src/app/(seller)/`). **Before** = status found in Phase 1 (no code changed); **After** = status once Phase 2 fixes are in. A row is Done only with evidence; anything not checked would be Missing.

**Before:** Done 65, Partial 14  
**After:** Done 78, Partial 1


## 1. Structure and kinds

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| K1 | Done | Done | `A:layout.tsx:62`<br>`A:layout.tsx:76`<br>`S:layout.tsx:58`<br>`A:gigs/gigs-panel.tsx:47` | Admin: Listing > Product / Gig; seller: Listing tab with Product / Gigs row. Screens exist for both. |
| K2 | Done | Done | `A:catalog/listings/listing-form.tsx:374`<br>`A:gigs/gig-form.tsx:436` | There is no type selector at all: the product form always sends product, the gig form only offers service categories, so the defaults are fixed. |
| K3 | Done | Done | `src/lib/listing-api.ts:285` | Both the list and the pending list always send catalog_type=product; jobs never show. No create-job form exists. |
| K4 | Done | Done | `A:catalog/listings/[id]/listing-detail-client.tsx:76`<br>`A:gigs/[id]/gig-detail-client.tsx:72`<br>`S:seller/listings/[id]/listing-detail-client.tsx:83`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:84` | Matrix 9 / 24 test it in the browser. |
| K5 | Done | Done | `A:catalog/listings/listing-form.tsx:374`<br>`A:gigs/gig-form.tsx:258` | No catalog_type / posted_by_role input on any form; the gig body never carries them. |
| K6 | Done | Done | `src/lib/gig-api.ts:69` | `price_type` exists only as the gig PACKAGE field (required by the gig contract). Grep finds no hourly_rate, duration input or total_price in src. |
| K7 | Partial | Done | `src/lib/pending-listing-count.ts:4`<br>`src/lib/pending-gig-count.ts:4`<br>`A:catalog/listings/new/listing-create-client.tsx:32`<br>`A:catalog/listings/[id]/listing-detail-client.tsx:18`<br>`A:gigs/[id]/gig-detail-client.tsx:18` | Before: creating a product with status=pending did not refresh the badge. Fixed. |

## 2. Access, login and error handling

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| A1 | Done | Done | `src/lib/listing-api.ts:286`<br>`src/lib/gig-api.ts:175` | No super-admin gate on listings / gigs (only Admins is superAdminOnly). |
| A2 | Partial | Done | `src/lib/auth.ts:200`<br>`src/lib/use-managed-list.ts:14`<br>`src/lib/load-error.ts:1` | Before: detail / edit screens showed a generic 'Couldn't load' for 403. Now 403 shows 'not allowed'. |
| A3 | Done | Done | `src/lib/auth.ts:66`<br>`src/lib/auth.ts:152` | Rotating refresh token replaces the stored one. Matrix 25. |
| A4 | Done | Done | `S:layout.tsx:22`<br>`S:seller/listings/layout.tsx:12`<br>`S:seller/gigs/layout.tsx:12`<br>`S:layout.tsx:20` | Tabs hide for a seller who cannot operate; both listing areas show a locked page instead of the screens. Matrix 23. |
| A5 | Done | Done | `src/lib/use-managed-list.ts:122`<br>`A:catalog/listings/listing-form.tsx:161`<br>`A:gigs/gig-form.tsx:84`<br>`A:gigs/packages-editor.tsx:94` | Field, nested row (skus.N.field), section and {detail} errors are mapped; unknown ones go to a banner. |
| A6 | Done | Done | `src/lib/gig-api.ts:71`<br>`src/lib/listing-api.ts:73` | All money is typed and sent as string. Number() is used only to compare / format for display. |
| A7 | Done | Done | `A:catalog/category-panel.tsx:232`<br>`A:catalog/brands-panel.tsx:141`<br>`A:catalog/attributes-panel.tsx:377`<br>`A:catalog/attributes-panel.tsx:29`<br>`A:_shared/delete-conflict.tsx:6` |  |
| A8 | Done | Done | `A:catalog/listings-panel.tsx:427`<br>`A:gigs/gigs-panel.tsx:419`<br>`S:seller/gigs/gigs-client.tsx:294`<br>`A:gigs/gig-form.tsx:595`<br>`A:catalog/listings/listing-form.tsx:905` | Every list has loading / empty / error; every submit is disabled while running. |
| A9 | Partial | Done | `src/components/thumbnail-control.tsx:8`<br>`A:catalog/category-panel.tsx:363` | Before: the category panel used the raw image_url (broken on a local /media/ URL). Fixed. |

## 3. Lists, search, filters, pagination

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| L1 | Done | Done | `src/lib/use-managed-list.ts:29`<br>`src/lib/use-managed-list.ts:49`<br>`S:seller/listings/listings-client.tsx:28`<br>`S:seller/gigs/gigs-client.tsx:14` | Matrix 26. |
| L2 | Partial | Done | `src/lib/use-cursor-list.ts:27`<br>`A:gigs/requests/gig-requests-client.tsx:35`<br>`A:catalog/listings/requests/listing-requests-client.tsx:40`<br>`A:gigs/requests/gig-requests-client.tsx:60` | Before: no `id` ordering option in either pending list. Added. |
| L3 | Partial | Done | `A:catalog/listings-panel.tsx:67`<br>`A:catalog/listings-panel.tsx:68`<br>`A:catalog/listings-panel.tsx:69`<br>`A:catalog/listings-panel.tsx:70`<br>`A:catalog/listings-panel.tsx:71` | Before: All Listings had no category or seller filter. `catalog_type` is fixed to product and `buyer` is N/A (buyers own jobs only). |
| L4 | Done | Done | `A:gigs/gigs-panel.tsx:63`<br>`A:gigs/gigs-panel.tsx:64`<br>`A:gigs/gigs-panel.tsx:65`<br>`A:gigs/gigs-panel.tsx:66` |  |
| L5 | Partial | Done | `S:seller/listings/listings-client.tsx:146`<br>`S:seller/listings/listings-client.tsx:30`<br>`S:seller/gigs/gigs-client.tsx:92`<br>`S:seller/gigs/gigs-client.tsx:64`<br>`S:seller/gigs/gigs-client.tsx:94` | Before: seller gigs list had no category or date filters. Added. |
| L6 | Done | Done | `A:gigs/gigs-panel.tsx:434`<br>`A:gigs/gigs-panel.tsx:447`<br>`S:seller/gigs/gigs-client.tsx:324`<br>`S:seller/listings/listings-client.tsx:371` |  |
| L7 | Partial | Done | `A:catalog/listings/listing-utils.tsx:8`<br>`A:catalog/listings/listing-utils.tsx:50` | Before: pending and changes_requested shared the amber badge. changes_requested now has its own. |

## 4. Product form

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| P1 | Done | Done | `A:catalog/listings/sku-model.ts:265`<br>`A:catalog/listings/sku-model.ts:280` | Always sends the full `skus` list on create; the price shortcut is not used, so never both. |
| P2 | Done | Done | `A:catalog/listings/listing-form.tsx:574`<br>`A:catalog/listings/listing-form.tsx:562`<br>`A:catalog/listings/seller-category-picker.tsx:4` |  |
| P3 | Done | Done | `A:catalog/listings/listing-form.tsx:265`<br>`A:catalog/listings/listing-form.tsx:599`<br>`A:catalog/listings/listing-lookups.ts:69` | Server 400 on `brand` is shown by err("brand"). Matrix 2. |
| P4 | Partial | Done | `A:catalog/listings/listing-form.tsx:761`<br>`A:catalog/listings/listing-form.tsx:141`<br>`A:catalog/listings/listing-form.tsx:149` | Before: min_order_qty allowed 0 (must be >= 1). Fixed. Seller form has no currency input (the seller API has no currency field); admin form has it. |
| P5 | Done | Done | `A:catalog/listings/listing-form.tsx:523`<br>`A:catalog/listings/listing-form.tsx:551`<br>`A:catalog/listings/listing-form.tsx:142`<br>`A:catalog/listings/listing-form.tsx:144`<br>`A:catalog/listings/listing-form.tsx:809` | Five Bangla fields; no package_includes_bn on the product form. |
| P6 | Done | Done | `A:catalog/listings/listing-form.tsx:414`<br>`src/lib/listing-api.ts:232` | The product input type and form have none of delivery_days / urgent / package_includes* / available_*. |
| P7 | Done | Done | `A:catalog/listings/listing-form.tsx:25`<br>`A:catalog/listings/listing-form.tsx:891`<br>`A:_shared/geography-fields.tsx:14` |  |
| P8 | Done | Done | `A:catalog/listings/listing-form.tsx:450`<br>`A:gigs/gig-form.tsx:342` | The (listing #N) suffix becomes a link; seller / admin message both pass through unchanged. |
| P9 | Done | Done | `A:catalog/listings/sku-editor.tsx:480`<br>`A:catalog/listings/sku-editor.tsx:492`<br>`A:catalog/listings/sku-editor.tsx:394`<br>`A:catalog/listings/sku-editor.tsx:578` | price / stock min 0; discounted max = price; read-only effective price and discount state. |
| P10 | Done | Done | `A:catalog/listings/sku-model.ts:176`<br>`A:catalog/listings/sku-model.ts:133`<br>`A:catalog/listings/listing-lookups.ts:71` | One value per attribute per SKU comes from the combination generator; saved combinations stay locked. Matrix 1. |
| P11 | Done | Done | `A:catalog/listings/sku-model.ts:219`<br>`A:catalog/listings/sku-editor.tsx:437`<br>`A:catalog/listings/sku-editor.tsx:91` | Matrix 3 / 4. |
| P12 | Done | Done | `A:catalog/listings/sku-model.ts:265`<br>`src/lib/listing-api.ts:230` | On edit only `skus` carries prices and stock. |
| P13 | Partial | Done | `A:catalog/listings/listing-form.tsx:748`<br>`A:catalog/listings/listing-form.tsx:733`<br>`A:catalog/listings/listing-form.tsx:82` | Before: no client-side tier checks and min_qty allowed 0. Added min 1, max >= min, no overlap, only the last open-ended, discount <= price. Server error still mapped. |
| P14 | Done | Done | `A:catalog/listings/new/listing-create-client.tsx:5`<br>`A:catalog/listings/[id]/edit/listing-edit-client.tsx:10` |  |
| P15 | Partial | Done | `A:catalog/listings/[id]/edit/listing-edit-client.tsx:16`<br>`S:seller/listings/listing-payload.ts:65` | Before: the ADMIN product edit sent the whole form. Now both admin and seller edits send only changed fields. |

## 5. Gig form

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| G1 | Done | Done | `A:gigs/gig-form.tsx:436`<br>`A:gigs/package-model.ts:125`<br>`A:gigs/gig-form.tsx:37` |  |
| G2 | Done | Done | `A:gigs/gig-form.tsx:507`<br>`A:gigs/gig-form.tsx:543`<br>`A:gigs/gig-form.tsx:568`<br>`A:gigs/gig-form.tsx:521`<br>`A:gigs/gig-form.tsx:26`<br>`A:gigs/gig-form.tsx:689` | Seller variant omits owner, status and currency. |
| G3 | Done | Done | `A:gigs/gig-form.tsx:61`<br>`src/lib/gig-api.ts:144` | The form has none of the product fields; a crafted request is mapped by the banner (matrix 8). |
| G4 | Done | Done | `A:gigs/packages-editor.tsx:218`<br>`A:gigs/packages-editor.tsx:244`<br>`A:gigs/packages-editor.tsx:274`<br>`A:gigs/packages-editor.tsx:344`<br>`A:gigs/gig-utils.tsx:10` |  |
| G5 | Done | Done | `A:gigs/packages-editor.tsx:237`<br>`A:gigs/packages-editor.tsx:63`<br>`A:gigs/packages-editor.tsx:384`<br>`A:gigs/packages-editor.tsx:116` | Matrix 7. |
| G6 | Done | Done | `A:gigs/package-model.ts:222`<br>`A:gigs/package-model.ts:172` | Saved packages have no Remove button, only Active / Hidden. |
| G7 | Done | Done | `A:gigs/packages-editor.tsx:65` | No duration / stock / options inputs; none are ever sent. |
| G8 | Done | Done | `A:gigs/[id]/gig-detail-client.tsx:145`<br>`A:gigs/gig-profile-view.tsx:187` |  |
| G9 | Done | Done | `A:gigs/gig-form.tsx:342` |  |

## 6. Thumbnail

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| T1 | Done | Done | `src/lib/listing-api.ts:152`<br>`src/lib/gig-api.ts:245`<br>`src/lib/seller-listing-api.ts:166`<br>`src/lib/seller-gig-api.ts:83` |  |
| T2 | Done | Done | `src/components/thumbnail-control.tsx:18`<br>`src/components/thumbnail-control.tsx:109` | Matrix 10 (.txt, 11 MB). |
| T3 | Partial | Partial | `A:catalog/listings/listing-form.tsx:899`<br>`A:catalog/listings/new/listing-create-client.tsx:49`<br>`A:catalog/listings/[id]/edit/page.tsx:10` | DEVIATION, kept on purpose: the thumbnail is picked on the create form and uploaded right after the first save (POST, then PUT; a failed PUT leaves the listing and opens the edit page with the error). The checklist says the control is enabled only after the first save: this is a superset. Open question for the owner. |
| T4 | Done | Done | `src/components/thumbnail-control.tsx:126`<br>`src/components/thumbnail-control.tsx:68`<br>`src/components/thumbnail-control.tsx:55`<br>`src/lib/listing-api.ts:378` | No Content-Type is ever set for FormData. |
| T5 | Partial | Done | `src/components/thumbnail-control.tsx:47`<br>`S:seller/listings/[id]/listing-detail-client.tsx:156`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:166` | Before: a hint text only. Now the control asks for confirmation before the upload on a rejected / changes-requested item; the status refreshes after (matrix 20). |
| T6 | Done | Done | `A:catalog/listings/listing-change-history.tsx:45`<br>`A:catalog/listings/listing-change-history.tsx:361` |  |

## 7. Gallery media

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| M1 | Done | Done | `A:catalog/listings/new/listing-create-client.tsx:5`<br>`src/lib/gig-api.ts:222`<br>`A:gigs/gig-form.tsx:47` |  |
| M2 | Partial | Done | `A:catalog/listings/listing-form.tsx:20`<br>`A:gigs/gig-form.tsx:15`<br>`A:gigs/gig-form.tsx:16` | Before: the seller GIG form had no media limits. Added (types, 10 MB, 10 per request, 20 per gig). |
| M3 | Partial | Done | `src/components/media-preview.tsx:22`<br>`A:catalog/listings/listing-profile-view.tsx:6`<br>`A:gigs/gig-profile-view.tsx:6` | Before: video / document showed only a type label. Now image inline, video with a player, document as a link. |

## 8. Admin moderation

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| D1 | Done | Done | `A:catalog/listings/listing-moderation-panel.tsx:14`<br>`A:gigs/requests/gig-requests-client.tsx:208`<br>`A:catalog/listings-panel.tsx:375` | Matrix 12 / 13. |
| D2 | Done | Done | `A:catalog/listings/listing-moderation-panel.tsx:88`<br>`A:catalog/listings/listing-moderation-panel.tsx:148`<br>`A:catalog/listings/listing-moderation-panel.tsx:129` |  |
| D3 | Done | Done | `A:catalog/listings-panel.tsx:12`<br>`A:gigs/gigs-panel.tsx:10`<br>`A:gigs/requests/gig-requests-client.tsx:16`<br>`A:catalog/listings-panel.tsx:199` |  |
| D4 | Done | Done | `A:catalog/listings/requests/listing-requests-client.tsx:23`<br>`A:gigs/requests/gig-requests-client.tsx:33`<br>`A:catalog/listings/requests/listing-requests-client.tsx:22` | Server orders -requested_at; matrix 19 checks the top position. |
| D5 | Done | Done | `A:catalog/listings/listing-change-history.tsx:199`<br>`A:catalog/listings/listing-change-history.tsx:126`<br>`A:catalog/listings/listing-change-history.tsx:320`<br>`A:catalog/listings/listing-change-history.tsx:223` |  |
| D6 | Done | Done | `A:catalog/listings/listing-form.tsx:1000`<br>`A:gigs/gig-form.tsx:689`<br>`A:catalog/listings/listing-owner-picker.tsx:25` | Owner is seller or none; a buyer owner is not offered (jobs are not created here). |
| D7 | Done | Done | `A:catalog/listings/[id]/listing-detail-client.tsx:119`<br>`A:gigs/[id]/gig-detail-client.tsx:115`<br>`A:catalog/listings-panel.tsx:162` | Matrix 14. |
| D8 | Done | Done | `A:catalog/listings/listing-form.tsx:169`<br>`A:gigs/gig-form.tsx:293` | The owner can be changed on edit and the title rule error is shown on the title. |

## 9. Seller rules

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| S1 | Done | Done | `A:catalog/listings/listing-form.tsx:434`<br>`A:gigs/gig-form.tsx:326`<br>`S:seller/listings/new/listing-create-client.tsx:56`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:32` | Matrix 15. |
| S2 | Done | Done | `S:seller/listings/[id]/listing-detail-client.tsx:83`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:84` | Matrix 24. |
| S3 | Done | Done | `S:seller/listings/[id]/listing-detail-client.tsx:137`<br>`src/lib/seller-listing-api.ts:29` | No delete function exists in the seller API clients and no delete button on any seller screen. |
| S4 | Done | Done | `S:seller/listings/[id]/edit/listing-edit-client.tsx:89`<br>`S:seller/gigs/[id]/edit/gig-edit-client.tsx:87`<br>`S:seller/listings/[id]/listing-detail-client.tsx:40` |  |
| S5 | Done | Done | `S:seller/listings/[id]/listing-detail-client.tsx:54`<br>`S:seller/listings/listing-status.tsx:57`<br>`A:catalog/listings/listing-form.tsx:266`<br>`A:gigs/gig-form.tsx:134` | The history shows 'an admin', never which one. Matrix 18. |
| S6 | Done | Done | `src/lib/seller-listing-api.ts:87`<br>`src/lib/seller-gig-api.ts:34` |  |
| S7 | Done | Done | `src/lib/seller-listing-api.ts:182` |  |
| S8 | Done | Done | `S:seller/listings/layout.tsx:14`<br>`S:seller/gigs/layout.tsx:14`<br>`S:seller/listings/listing-status.tsx:89` |  |
| S9 | Done | Done | `S:seller/listings/listings-client.tsx:371`<br>`S:seller/listings/listings-client.tsx:395`<br>`S:seller/gigs/gigs-client.tsx:327` |  |

## 10. Reference-data screens

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| R1 | Done | Done | `A:catalog/category-panel.tsx:18`<br>`A:catalog/brands-panel.tsx:14`<br>`A:catalog/attributes-panel.tsx:20`<br>`A:catalog/catalog-tabs.ts:3` | Screens untouched except the category image URL; build passes and the Catalog tabs are opened in the browser test. |
| R2 | Done | Done | `A:catalog/category-parent-picker.tsx:93`<br>`A:catalog/listings/listing-form.tsx:262`<br>`A:catalog/listings/sku-model.ts:157` |  |

## 11. Negative checks

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| N1 | Done | Done | `src/lib/listing-api.ts:31` | grep -rE 'hourly_rate|total_price|duration' src finds only comments. |
| N2 | Done | Done | `A:catalog/listings/listing-form.tsx:34`<br>`A:gigs/gig-form.tsx:436` | No service option in the product form, no product option in the gig form, no job form, no order / cart / hiring / bidding screen. |
| N3 | Done | Done | `.gitignore:34`<br>`src/lib/env.ts:2` | Every endpoint is from the docs; `git ls-files` has no .env or secret. |
| N4 | Done | Done | `S:seller/listings/[id]/listing-detail-client.tsx:16`<br>`A:gigs/gig-form.tsx:176` |  |

## 12. Test matrix (browser, local backend, test accounts)

Backend: local throwaway database `egoola` (`createdb`, `migrate`, seeded accounts and ids), Django run from a venv because `uv` is not installed; web on port 3001. Extra seed: attributes Size / Colour, brand Acme, sellers in every state, 25 pending products and 25 pending gigs.

| # | Result | What was seen |
|---|---|---|
| 1 | Pass | Admin product, Size x Colour = 4 SKUs, one price tier, thumbnail: created `approved`, 4 SKUs sent, thumbnail visible in detail and list. |
| 2 | Pass | `listing_type = brand` without a brand: the brand select is required, no request is sent; the server `400 {"brand": [...]}` is shown on the field. |
| 3 | Pass | Edited one SKU price: PATCH body was exactly `{"skus":[{"id":9,"price":"123"}]}`; the change log has the SKUs block. |
| 4 | Pass | Hide sent `{id, is_active:false}`, the row stays (greyed) with no delete button; show sent `is_active:true`. |
| 5 | Pass | Overlapping tiers are refused client-side ("must not overlap", no request); the server `400` on `price_tiers` for a crafted request shows the same message. |
| 6 | Pass | Admin gig with hourly + weekly + fixed packages and owner Test Seller: created `approved`, 3 packages; package inputs are price type, rate, code, discount, dates, descriptions only (no stock / options / duration). |
| 7 | Pass | Used price types (hidden ones too) are disabled and "Show it again" is offered; Add package is disabled once all five exist; a crafted duplicate `hourly` returns `{"skus": ["Every gig SKU needs its own price type ..."]}`, shown in the packages section. |
| 8 | Pass | A crafted POST with `brand` and `stock_qty` on a gig: `400` shown as a banner line ("brand: Not available here."), page keeps working. |
| 9 | Pass | Product id on `/admin/gigs/<id>` and gig id on `/admin/catalog/listings/<id>`: both show "not found" screens. |
| 10 | Pass | jpg upload 200, replace 200, remove 204, `.txt` and 11 MB blocked client-side, a fake `.png` gets `400 {"image": [...]}` shown on the control; the current picture is kept after a refused upload. |
| 11 | Pass | Pending gigs and pending products: 20 rows, "Load more" follows the server `next` (`?cursor=...`) to 26 rows, no count or page numbers, changing the sort resets to 20; menu badges read 26 / 26. |
| 12 | Pass | Reject without note blocked; reject with note, request changes, approve all worked; 4 history rows; the menu badge dropped 26 -> 25 -> 24 after the actions. |
| 13 | Pass | Bulk approve of 3 gigs: `{listing_ids, status:"approved"}` -> "3 gigs updated"; bulk reject without a note sends no request. |
| 14 | Pass | Soft delete of a gig: `204`, gone from the list, its detail shows "not found". |
| 15 | Pass | Seller (verified + active) created a product: `pending`, no owner / status inputs, "Waiting for review". |
| 16 | Pass | Same title (different case and spaces): "You already have a listing with this title" with a link to the existing listing. |
| 17 | Pass | 11 files, an 11 MB file and an `.exe` are blocked with messages; the server `400 {"media_file": [...]}` for an `.exe` has the same shape. |
| 18 | Pass | After the admin rejected it, the seller sees the reason and the history line "An admin rejected it: ..." with no admin name. |
| 19 | Pass | "Save and send for review" -> `pending`; the product is first in the admin pending list. |
| 20 | Pass | On a rejected product the thumbnail change asks for confirmation first, then the status becomes "Waiting for review". |
| 21 | Pass | Admin approved, seller edited: stays `approved`; the admin change log shows the seller's `description` edit. |
| 22 | Pass | No delete button on any seller screen; forced `DELETE` on a listing and on a gig returns `405`. |
| 23 | Pass | Paused (verified + inactive), pending, rejected (reason + resubmit link) and unverified sellers see a locked page on the list and create URLs of both areas, with no Listing tab and no create button; a suspended seller cannot log in (`401`). |
| 24 | Pass | Another seller's product, another seller's gig and a product id on the gig URL all show "couldn't find" screens. |
| 25 | Pass | A bad access token: one refresh POST, the page loads, a new refresh token is stored; a failed refresh clears the session and goes to `/login` once (no loop). |
| 26 | Pass | 28 products: "Page 1 of 2" with 20 rows, Next -> page 2, changing the status filter returns to page 1. |
| 27 | Pass | `npm run ci`: lint, typecheck and build pass. |

**Matrix: 27 Pass, 0 Fail of 27.**


## 13. Open questions and notes

- **T3 (kept Partial, on purpose):** the checklist says the thumbnail control is enabled after the first save. The create forms let the user pick the picture first and upload it right after the first save (POST, then PUT; a failed upload keeps the listing and opens its edit page with the error). Say if you want the strict version (control hidden until the first save).
- **Seller currency:** the seller forms have no currency input because the seller API has no `currency` field (see seller-api-guide section 6.2); the admin forms have one.
- **Backend:** no backend bug found. Behaviour that differs from a plain reading of the docs: a 400 for an oversize file made of zeros reports "not a valid image" (the image check runs first), so the size message in the UI comes from the client check.
- **Refresh:** `authFetch` now reuses a newer stored access token instead of refreshing a second time when two requests fail together.

