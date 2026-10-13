# Listings / Gigs audit (Admin and Seller panels)

Source checklist: `egoola-server/docs/frontend-listing-audit-prompt.md`. Evidence is `file:line` in `egoola-web` (`A:` = `src/app/(admin)/admin/(protected)/`, `S:` = `src/app/(seller)/`). **Before** = status found in Phase 1 (no code changed); **After** = status once Phase 2 fixes are in. A row is Done only with evidence; anything not checked would be Missing.

**Before:** Done 65, Partial 14  


## 1. Structure and kinds

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| K1 | Done | — | `A:layout.tsx:62`<br>`A:layout.tsx:76`<br>`S:layout.tsx:58`<br>`A:gigs/gigs-panel.tsx:47` | Admin: Listing > Product / Gig; seller: Listing tab with Product / Gigs row. Screens exist for both. |
| K2 | Done | — | `A:catalog/listings/listing-form.tsx:326`<br>`A:gigs/gig-form.tsx:387` | There is no type selector at all: the product form always sends product, the gig form only offers service categories, so the defaults are fixed. |
| K3 | Done | — | `src/lib/listing-api.ts:285` | Both the list and the pending list always send catalog_type=product; jobs never show. No create-job form exists. |
| K4 | Done | — | `A:catalog/listings/[id]/listing-detail-client.tsx:77`<br>`A:gigs/[id]/gig-detail-client.tsx:73`<br>`S:seller/listings/[id]/listing-detail-client.tsx:83`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:84` | Matrix 9 / 24 test it in the browser. |
| K5 | Done | — | `A:catalog/listings/listing-form.tsx:326`<br>`A:gigs/gig-form.tsx:209` | No catalog_type / posted_by_role input on any form; the gig body never carries them. |
| K6 | Done | — | `src/lib/gig-api.ts:69` | `price_type` exists only as the gig PACKAGE field (required by the gig contract). Grep finds no hourly_rate, duration input or total_price in src. |
| K7 | Partial | — | `src/lib/pending-listing-count.ts:4`<br>`src/lib/pending-gig-count.ts:4`<br>`A:catalog/listings/[id]/listing-detail-client.tsx:17`<br>`A:gigs/[id]/gig-detail-client.tsx:17` | Before: creating a product with status=pending did not refresh the badge. Fixed. |

## 2. Access, login and error handling

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| A1 | Done | — | `src/lib/listing-api.ts:286`<br>`src/lib/gig-api.ts:175` | No super-admin gate on listings / gigs (only Admins is superAdminOnly). |
| A2 | Partial | — | `src/lib/auth.ts:195`<br>`src/lib/use-managed-list.ts:14` | Before: detail / edit screens showed a generic 'Couldn't load' for 403. Now 403 shows 'not allowed'. |
| A3 | Done | — | `src/lib/auth.ts:66`<br>`src/lib/auth.ts:152` | Rotating refresh token replaces the stored one. Matrix 25. |
| A4 | Done | — | `S:layout.tsx:22`<br>`S:seller/listings/layout.tsx:12`<br>`S:seller/gigs/layout.tsx:12`<br>`S:layout.tsx:20` | Tabs hide for a seller who cannot operate; both listing areas show a locked page instead of the screens. Matrix 23. |
| A5 | Done | — | `src/lib/use-managed-list.ts:122`<br>`A:catalog/listings/listing-form.tsx:121`<br>`A:gigs/gig-form.tsx:76`<br>`A:gigs/packages-editor.tsx:94` | Field, nested row (skus.N.field), section and {detail} errors are mapped; unknown ones go to a banner. |
| A6 | Done | — | `src/lib/gig-api.ts:71`<br>`src/lib/listing-api.ts:73` | All money is typed and sent as string. Number() is used only to compare / format for display. |
| A7 | Done | — | `A:catalog/category-panel.tsx:231`<br>`A:catalog/brands-panel.tsx:141`<br>`A:catalog/attributes-panel.tsx:377`<br>`A:catalog/attributes-panel.tsx:29`<br>`A:_shared/delete-conflict.tsx:6` |  |
| A8 | Done | — | `A:catalog/listings-panel.tsx:397`<br>`A:gigs/gigs-panel.tsx:419`<br>`S:seller/gigs/gigs-client.tsx:213`<br>`A:gigs/gig-form.tsx:546`<br>`A:catalog/listings/listing-form.tsx:855` | Every list has loading / empty / error; every submit is disabled while running. |
| A9 | Partial | — | `src/components/thumbnail-control.tsx:8` | Before: the category panel used the raw image_url (broken on a local /media/ URL). Fixed. |

## 3. Lists, search, filters, pagination

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| L1 | Done | — | `src/lib/use-managed-list.ts:29`<br>`src/lib/use-managed-list.ts:49`<br>`S:seller/listings/listings-client.tsx:28`<br>`S:seller/gigs/gigs-client.tsx:14` | Matrix 26. |
| L2 | Partial | — | `src/lib/use-cursor-list.ts:27`<br>`A:gigs/requests/gig-requests-client.tsx:35`<br>`A:catalog/listings/requests/listing-requests-client.tsx:40`<br>`A:gigs/requests/gig-requests-client.tsx:58` | Before: no `id` ordering option in either pending list. Added. |
| L3 | Partial | — | `A:catalog/listings-panel.tsx:57`<br>`A:catalog/listings-panel.tsx:58`<br>`A:catalog/listings-panel.tsx:59` | Before: All Listings had no category or seller filter. `catalog_type` is fixed to product and `buyer` is N/A (buyers own jobs only). |
| L4 | Done | — | `A:gigs/gigs-panel.tsx:63`<br>`A:gigs/gigs-panel.tsx:64`<br>`A:gigs/gigs-panel.tsx:65`<br>`A:gigs/gigs-panel.tsx:66` |  |
| L5 | Partial | — | `S:seller/listings/listings-client.tsx:146`<br>`S:seller/listings/listings-client.tsx:30`<br>`S:seller/gigs/gigs-client.tsx:76` | Before: seller gigs list had no category or date filters. Added. |
| L6 | Done | — | `A:gigs/gigs-panel.tsx:434`<br>`A:gigs/gigs-panel.tsx:447`<br>`S:seller/gigs/gigs-client.tsx:243`<br>`S:seller/listings/listings-client.tsx:371` |  |
| L7 | Partial | — | `A:catalog/listings/listing-utils.tsx:8` | Before: pending and changes_requested shared the amber badge. changes_requested now has its own. |

## 4. Product form

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| P1 | Done | — | `A:catalog/listings/sku-model.ts:265`<br>`A:catalog/listings/sku-model.ts:280` | Always sends the full `skus` list on create; the price shortcut is not used, so never both. |
| P2 | Done | — | `A:catalog/listings/listing-form.tsx:526`<br>`A:catalog/listings/listing-form.tsx:514`<br>`A:catalog/listings/seller-category-picker.tsx:4` |  |
| P3 | Done | — | `A:catalog/listings/listing-form.tsx:224`<br>`A:catalog/listings/listing-form.tsx:551`<br>`A:catalog/listings/listing-lookups.ts:69` | Server 400 on `brand` is shown by err("brand"). Matrix 2. |
| P4 | Partial | — | `A:catalog/listings/listing-form.tsx:712`<br>`A:catalog/listings/listing-form.tsx:101`<br>`A:catalog/listings/listing-form.tsx:109` | Before: min_order_qty allowed 0 (must be >= 1). Fixed. Seller form has no currency input (the seller API has no currency field); admin form has it. |
| P5 | Done | — | `A:catalog/listings/listing-form.tsx:475`<br>`A:catalog/listings/listing-form.tsx:503`<br>`A:catalog/listings/listing-form.tsx:102`<br>`A:catalog/listings/listing-form.tsx:104`<br>`A:catalog/listings/listing-form.tsx:759` | Five Bangla fields; no package_includes_bn on the product form. |
| P6 | Done | — | `A:catalog/listings/listing-form.tsx:366`<br>`src/lib/listing-api.ts:232` | The product input type and form have none of delivery_days / urgent / package_includes* / available_*. |
| P7 | Done | — | `A:catalog/listings/listing-form.tsx:24`<br>`A:catalog/listings/listing-form.tsx:841`<br>`A:_shared/geography-fields.tsx:14` |  |
| P8 | Done | — | `A:catalog/listings/listing-form.tsx:402`<br>`A:gigs/gig-form.tsx:293` | The (listing #N) suffix becomes a link; seller / admin message both pass through unchanged. |
| P9 | Done | — | `A:catalog/listings/sku-editor.tsx:480`<br>`A:catalog/listings/sku-editor.tsx:492`<br>`A:catalog/listings/sku-editor.tsx:394`<br>`A:catalog/listings/sku-editor.tsx:578` | price / stock min 0; discounted max = price; read-only effective price and discount state. |
| P10 | Done | — | `A:catalog/listings/sku-model.ts:176`<br>`A:catalog/listings/sku-model.ts:133`<br>`A:catalog/listings/listing-lookups.ts:71` | One value per attribute per SKU comes from the combination generator; saved combinations stay locked. Matrix 1. |
| P11 | Done | — | `A:catalog/listings/sku-model.ts:219`<br>`A:catalog/listings/sku-editor.tsx:437`<br>`A:catalog/listings/sku-editor.tsx:91` | Matrix 3 / 4. |
| P12 | Done | — | `A:catalog/listings/sku-model.ts:265`<br>`src/lib/listing-api.ts:230` | On edit only `skus` carries prices and stock. |
| P13 | Partial | — | `A:catalog/listings/listing-form.tsx:699`<br>`A:catalog/listings/listing-form.tsx:684` | Before: no client-side tier checks and min_qty allowed 0. Added min 1, max >= min, no overlap, only the last open-ended, discount <= price. Server error still mapped. |
| P14 | Done | — | `A:catalog/listings/new/listing-create-client.tsx:5`<br>`A:catalog/listings/[id]/edit/listing-edit-client.tsx:10` |  |
| P15 | Partial | — | `S:seller/listings/listing-payload.ts:65` | Before: the ADMIN product edit sent the whole form. Now both admin and seller edits send only changed fields. |

## 5. Gig form

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| G1 | Done | — | `A:gigs/gig-form.tsx:387`<br>`A:gigs/package-model.ts:125`<br>`A:gigs/gig-form.tsx:29` |  |
| G2 | Done | — | `A:gigs/gig-form.tsx:458`<br>`A:gigs/gig-form.tsx:494`<br>`A:gigs/gig-form.tsx:519`<br>`A:gigs/gig-form.tsx:472`<br>`A:gigs/gig-form.tsx:18`<br>`A:gigs/gig-form.tsx:638` | Seller variant omits owner, status and currency. |
| G3 | Done | — | `A:gigs/gig-form.tsx:53`<br>`src/lib/gig-api.ts:144` | The form has none of the product fields; a crafted request is mapped by the banner (matrix 8). |
| G4 | Done | — | `A:gigs/packages-editor.tsx:218`<br>`A:gigs/packages-editor.tsx:244`<br>`A:gigs/packages-editor.tsx:274`<br>`A:gigs/packages-editor.tsx:344`<br>`A:gigs/gig-utils.tsx:10` |  |
| G5 | Done | — | `A:gigs/packages-editor.tsx:237`<br>`A:gigs/packages-editor.tsx:63`<br>`A:gigs/packages-editor.tsx:384`<br>`A:gigs/packages-editor.tsx:116` | Matrix 7. |
| G6 | Done | — | `A:gigs/package-model.ts:222`<br>`A:gigs/package-model.ts:172` | Saved packages have no Remove button, only Active / Hidden. |
| G7 | Done | — | `A:gigs/packages-editor.tsx:65` | No duration / stock / options inputs; none are ever sent. |
| G8 | Done | — | `A:gigs/[id]/gig-detail-client.tsx:148`<br>`A:gigs/gig-profile-view.tsx:186` |  |
| G9 | Done | — | `A:gigs/gig-form.tsx:293` |  |

## 6. Thumbnail

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| T1 | Done | — | `src/lib/listing-api.ts:152`<br>`src/lib/gig-api.ts:245`<br>`src/lib/seller-listing-api.ts:166`<br>`src/lib/seller-gig-api.ts:83` |  |
| T2 | Done | — | `src/components/thumbnail-control.tsx:18`<br>`src/components/thumbnail-control.tsx:105` | Matrix 10 (.txt, 11 MB). |
| T3 | Partial | — | `A:catalog/listings/listing-form.tsx:849`<br>`A:catalog/listings/new/listing-create-client.tsx:46`<br>`A:catalog/listings/[id]/edit/page.tsx:10` | DEVIATION, kept on purpose: the thumbnail is picked on the create form and uploaded right after the first save (POST, then PUT; a failed PUT leaves the listing and opens the edit page with the error). The checklist says the control is enabled only after the first save: this is a superset. Open question for the owner. |
| T4 | Done | — | `src/components/thumbnail-control.tsx:140`<br>`src/components/thumbnail-control.tsx:64`<br>`src/components/thumbnail-control.tsx:51`<br>`src/lib/listing-api.ts:378` | No Content-Type is ever set for FormData. |
| T5 | Partial | — | (see note) | Before: a hint text only. Now the control asks for confirmation before the upload on a rejected / changes-requested item; the status refreshes after (matrix 20). |
| T6 | Done | — | `A:catalog/listings/listing-change-history.tsx:45`<br>`A:catalog/listings/listing-change-history.tsx:361` |  |

## 7. Gallery media

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| M1 | Done | — | `A:catalog/listings/new/listing-create-client.tsx:5`<br>`src/lib/gig-api.ts:222`<br>`A:gigs/gig-form.tsx:39` |  |
| M2 | Partial | — | `A:catalog/listings/listing-form.tsx:19` | Before: the seller GIG form had no media limits. Added (types, 10 MB, 10 per request, 20 per gig). |
| M3 | Partial | — | (see note) | Before: video / document showed only a type label. Now image inline, video with a player, document as a link. |

## 8. Admin moderation

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| D1 | Done | — | `A:catalog/listings/listing-moderation-panel.tsx:14`<br>`A:gigs/requests/gig-requests-client.tsx:206`<br>`A:catalog/listings-panel.tsx:345` | Matrix 12 / 13. |
| D2 | Done | — | `A:catalog/listings/listing-moderation-panel.tsx:88`<br>`A:catalog/listings/listing-moderation-panel.tsx:148`<br>`A:catalog/listings/listing-moderation-panel.tsx:129` |  |
| D3 | Done | — | `A:catalog/listings-panel.tsx:12`<br>`A:gigs/gigs-panel.tsx:10`<br>`A:gigs/requests/gig-requests-client.tsx:16`<br>`A:catalog/listings-panel.tsx:183` |  |
| D4 | Done | — | `A:catalog/listings/requests/listing-requests-client.tsx:23`<br>`A:gigs/requests/gig-requests-client.tsx:33`<br>`A:catalog/listings/requests/listing-requests-client.tsx:22` | Server orders -requested_at; matrix 19 checks the top position. |
| D5 | Done | — | `A:catalog/listings/listing-change-history.tsx:199`<br>`A:catalog/listings/listing-change-history.tsx:126`<br>`A:catalog/listings/listing-change-history.tsx:320`<br>`A:catalog/listings/listing-change-history.tsx:223` |  |
| D6 | Done | — | `A:catalog/listings/listing-form.tsx:954`<br>`A:gigs/gig-form.tsx:638`<br>`A:catalog/listings/listing-owner-picker.tsx:25` | Owner is seller or none; a buyer owner is not offered (jobs are not created here). |
| D7 | Done | — | `A:catalog/listings/[id]/listing-detail-client.tsx:122`<br>`A:gigs/[id]/gig-detail-client.tsx:118`<br>`A:catalog/listings-panel.tsx:146` | Matrix 14. |
| D8 | Done | — | `A:catalog/listings/listing-form.tsx:129`<br>`A:gigs/gig-form.tsx:244` | The owner can be changed on edit and the title rule error is shown on the title. |

## 9. Seller rules

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| S1 | Done | — | `A:catalog/listings/listing-form.tsx:386`<br>`A:gigs/gig-form.tsx:277`<br>`S:seller/listings/new/listing-create-client.tsx:56`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:32` | Matrix 15. |
| S2 | Done | — | `S:seller/listings/[id]/listing-detail-client.tsx:83`<br>`S:seller/gigs/[id]/gig-detail-client.tsx:84` | Matrix 24. |
| S3 | Done | — | `S:seller/listings/[id]/listing-detail-client.tsx:137`<br>`src/lib/seller-listing-api.ts:29` | No delete function exists in the seller API clients and no delete button on any seller screen. |
| S4 | Done | — | `S:seller/listings/[id]/edit/listing-edit-client.tsx:89`<br>`S:seller/gigs/[id]/edit/gig-edit-client.tsx:87`<br>`S:seller/listings/[id]/listing-detail-client.tsx:40` |  |
| S5 | Done | — | `S:seller/listings/[id]/listing-detail-client.tsx:54`<br>`S:seller/listings/listing-status.tsx:56`<br>`A:catalog/listings/listing-form.tsx:225`<br>`A:gigs/gig-form.tsx:126` | The history shows 'an admin', never which one. Matrix 18. |
| S6 | Done | — | `src/lib/seller-listing-api.ts:87`<br>`src/lib/seller-gig-api.ts:34` |  |
| S7 | Done | — | `src/lib/seller-listing-api.ts:182` |  |
| S8 | Done | — | `S:seller/listings/layout.tsx:14`<br>`S:seller/gigs/layout.tsx:14`<br>`S:seller/listings/listing-status.tsx:88` |  |
| S9 | Done | — | `S:seller/listings/listings-client.tsx:371`<br>`S:seller/listings/listings-client.tsx:395`<br>`S:seller/gigs/gigs-client.tsx:246` |  |

## 10. Reference-data screens

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| R1 | Done | — | `A:catalog/category-panel.tsx:18`<br>`A:catalog/brands-panel.tsx:14`<br>`A:catalog/attributes-panel.tsx:20`<br>`A:catalog/catalog-tabs.ts:3` | Screens untouched except the category image URL; build passes and the Catalog tabs are opened in the browser test. |
| R2 | Done | — | `A:catalog/category-parent-picker.tsx:93`<br>`A:catalog/listings/listing-form.tsx:221`<br>`A:catalog/listings/sku-model.ts:157` |  |

## 11. Negative checks

| ID | Before | After | Evidence | Note |
|---|---|---|---|---|
| N1 | Done | — | `src/lib/listing-api.ts:31` | grep -rE 'hourly_rate|total_price|duration' src finds only comments. |
| N2 | Done | — | `A:catalog/listings/listing-form.tsx:33`<br>`A:gigs/gig-form.tsx:387` | No service option in the product form, no product option in the gig form, no job form, no order / cart / hiring / bidding screen. |
| N3 | Done | — | `.gitignore:34`<br>`src/lib/env.ts:2` | Every endpoint is from the docs; `git ls-files` has no .env or secret. |
| N4 | Done | — | `S:seller/listings/[id]/listing-detail-client.tsx:16`<br>`A:gigs/gig-form.tsx:177` |  |
