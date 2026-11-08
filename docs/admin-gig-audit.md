# Admin Gigs: cross-check against the backend brief

Brief: `egoola-server/docs/prompt/admin/frontend-admin-gigs-prompt.md`, with the contract in `egoola-server/docs/admin/admin-gigs-management-guide.md`. This is a code cross-check (section 6 of the brief). The browser cases in section 7 have not been run yet.

## Section 6 tasks

| # | Brief item | State |
|---|---|---|
| 1 | API client, one call per endpoint | Matches. `src/lib/gig-api.ts` has list, requests (cursor), detail, create, update, status, delete and bulk moderate. Thumbnail and gallery use the shared `listing-files-api.ts`. |
| 2 | List screen | Matches. It has `status`, `category` (service tree), `seller`, `price_type`, the four date filters and search. The "From" column shows the rate with its unit ("৳450 / hour", "fixed"). It has thumbnail, status and requested date, bulk approve, reject and request changes, and "+ Add Gig". |
| 3 | Create and edit form | Matches. It has the active service-category picker, Bangla twins, delivery, urgent, package includes, availability dates and the geography cascader. It has no stock, option or quantity-tier fields. The package builder offers one card per price type. A used type is disabled in the picker, a hidden package shows "Show it again", and "Add package" is off once all five types are used. |
| 4 | Detail view | Matches. The package table shows rate, rate now, discount window and Active or Hidden. It has thumbnail and gallery, the two histories kept apart (moderation panel and `ListingChangeHistory`), a required-note reject, and a confirmed delete. |
| 5 | Pending queue | Matches. `/admin/gigs/requests` is its own cursor-paged view, separate from the product queue, with its own menu badge. |
| 6 | Entry point | Matches. The admin nav has **Gigs** (Gigs List and Requested Gigs), separate from Products. |

## Contract details checked

- **Error shapes.** `parseFieldErrors` maps `{"skus": {"0": {"price_type": "..."}}}` to `skus.0.price_type` and shows it beside that package. The section error "two SKUs have the same price type" (a list under `skus`) shows above the cards. A product-only field refused with `{"brand": "Not available for a gig."}` lands in the red banner.
- **Create.** The form always sends `skus`. It never uses the `price` + `price_type` shortcut, which the guide allows but does not require.
- **Update.** Only changed fields are sent, and packages go by `id`. A new row has no `id`. Hiding is `is_active: false`. A package left unchanged is not sent.
- **No product-only fields.** `GigInput` has no `brand`, `listing_type`, `attributes`, `min_order_qty` or `price_tiers`, so the form cannot send them.
- **Packages never deleted.** A saved package only gets a Hidden badge. The Remove button exists for unsaved rows only.
- **404 on a product or job id.** The detail and edit screens show "This gig was not found, it may have been deleted, or it is a product".
- **`reserved_qty`.** Removed from `GigSku` with the product change, as the backend dropped it.

## Differences (none is a bug)

1. The list has no `created_at` column. The brief asks for "requested_at/created_at". Only the requested date is shown, and created is a filter.
2. The thumbnail control on the gig screens always calls `PATCH` on `listing-files/{id}/`. A second thumbnail replaces the first, where the brief's case 10 expects the second `POST` to be blocked. `PATCH` is the replace path the brief names, so the result is the same. The backend has reworded its verify checklist: `POST` blocks a second thumbnail, `PATCH` replaces it.
3. The category filter lists parent categories as well as leaves. The backend confirmed the admin `category` filter is an exact match with no sub-category rollup (unlike the public catalog), so picking a parent shows only gigs filed directly under it. This is the same on the products screen. The backend guides now say so. Kept on purpose: the dropdown offers every category so an admin can filter by any of them.
4. A saved package can change its price type (the select is open for it). The guide allows this ("a package keeps its price type unless a new one is sent"). Swapping the types of two saved packages in one save is blocked, because each type is "already used" by the other row.
5. Bulk moderation reports "skipped (already approved)". The guide says only already-at-status rows are skipped, so the wording is right. A product id mixed into the list is dropped silently by the server and is in neither count.

## Section 7 browser cases

Not run yet. Cases 1 to 14 are in the brief. By reading the code:

- 3, 4, 5, 6 and 7 are blocked in the form before any call.
- 1, 2, 8 to 14 need a real call.
