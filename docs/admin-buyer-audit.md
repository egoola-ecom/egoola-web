# Admin Buyer management: cross-check against the backend

Brief: `egoola-server/docs/admin/buyer-management-guide.md`, base path
`/api/v1/accounts/buyers/`. This is a static, source-code cross-check only — no
browser was driven and no dev server was started. The backend side (endpoint
behaviour, the new delete 409) was already verified live this session by the
person who requested this audit; this document compares that ground truth
against what the frontend source actually does. No existing frontend doc named
`admin-buyers*` was found in `egoola-web/docs` to cross-check against.

## Brief versus what is built

| Brief item | Built | Result |
|---|---|---|
| Admin-only (401 no token, 403 seller/buyer) | Calls go through `authFetch("admin", ...)`, same auth wrapper as every other admin screen | Pass (by inspection; matches the pattern already verified live for Sellers) |
| List with filters and paging | `buyers-client.tsx`: search (name/email/phone), status, email verified, phone verified, signed-up date range, and country/state/city/thana via `GeographyFields`. Columns: Name (+email under it), Phone, Status, Wallet | Pass. Every backend filter is exposed; no extra ones invented |
| Create (JSON or multipart) | "Add Buyer" modal: `BuyerForm` in `mode="create"` sends name, email, phone, password, status, description, skills, interests, experiences, educations, address_line, geography, and, if chosen, `profile_pic` and documents (`media_for`/`media_file`) — all via `buildBuyerFormData` as multipart | Pass |
| Retrieve (full record) | `buyer-detail-client.tsx` header (avatar, name, email, phone, status, wallet) + `buyer-profile-view.tsx` (email/phone verified-at, wallet, description, address, location, skills, interests, experience, education, documents) | Pass |
| Update (PATCH) | Separate Update page (`buyer-edit-client.tsx`) reusing `BuyerForm` in `mode="edit"`, diffed with `pickChanged` so only changed fields are sent | Pass |
| Rename | Name field, plain text input | Pass |
| Status change (active/suspended) | `Status` `<select>` in the form, two options only, matching the binary model (no three-tier `can_operate`/`can_edit_profile` logic invented) | Pass |
| Password change | Password field, blank = unchanged on edit, required on create, client-side pattern mirrors the server's 8-char/not-all-digits rule | Pass |
| profile_pic set / replace | `ProfilePictureField`: "Choose photo" / "Replace photo" | Pass |
| remove_profile_pic | Same component: "Remove photo" (marks it, clears preview) with "Undo remove"; a newly chosen file un-marks the removal, matching the backend rule that `profile_pic` in the same request wins | Pass |
| Media add (`media_for`+`media_file`) | `DocumentsSection`, configured with exactly the buyer's four kinds: `nid`, `birth_certificate`, `profile_document`, `other` — not the seller's six-kind set | Pass |
| Media remove (`media_delete_ids`) | Same section, toggled removal collected into `removedMediaIds` and sent as `media_delete_ids` | Pass |
| Delete | Confirm dialog, then `deleteBuyer(id)` | Pass (confirm exists) |
| Delete, 409 when the buyer has an order | — | **Gap, see below** |

## Live results

Not applicable in the way the Seller audit used the term — this pass did not call the API or drive a browser. The backend side (all of the above request/response shapes, the filters, the 409 behaviour) was independently verified live by the person who requested this audit, prior to this document, and is taken as given. This document only checked whether the frontend source code builds the matching request and handles the matching response.

## Gaps

1. **A refused delete shows the server's reason but offers no way forward.** `buyers-client.tsx`'s `handleDeleteClick` reads `err.body.detail` by hand and puts it in the generic `actionError` banner, so on a 409 the admin *does* see "This buyer has one or more orders. Suspend the account instead of deleting." — better than the pre-fix Seller screen, which showed a hardcoded generic message. But unlike the now-fixed Seller screen (`sellers-client.tsx`), it does not call the shared `isConflict()` / `apiErrorDetail()` helpers from `src/lib/api.ts`, and it offers no **Suspend instead** button or **Dismiss** button — the admin has to go find the Update page and change the status by hand. Since Buyer status is binary (`active`/`suspended`, no "deactivate" tier), the fix is simpler than the Seller one was: one button, not two. This is exactly the gap flagged as likely up front — the 409 behaviour is brand new server-side and the buyer screen predates it, same as Seller did before its fix.
2. **The Email field is required in the UI; the backend allows it to be empty.** `buyer-form.tsx`'s email `<input>` has `required`, on both create and edit. The guide states email is optional (empty = no email) and only unique *when given*. An admin can never create or save a buyer with no email through this screen, which is stricter than the API allows. Low impact (buyers normally have an email) but a real mismatch.
3. **No quick status action on the detail page.** The Seller detail page has dedicated Pause/Activate/Suspend buttons; the Buyer detail page (`buyer-detail-client.tsx`) has none — suspending or reactivating a buyer requires opening the Update page and changing the Status dropdown there. Not a correctness bug (the PATCH works), just a slower path than Seller's, worth flagging since the brief's own wording ("suspend the account instead of deleting") implies suspend should be a one-click action from the delete-refusal path, which doesn't exist yet (see Gap 1).

Everything else checked (list filters and columns, create, retrieve, rename, password change, profile picture set/replace/remove, media add/remove, the four correct `media_for` values) matches the backend guide exactly, with no invented fields and no leftover Seller-specific concepts (three-tier access, six media kinds, verification workflow) accidentally carried over.

## Notes

- Shared helpers `isConflict()` and `apiErrorDetail()` already exist in `src/lib/api.ts` and are already used by `sellers-client.tsx`, `category-panel.tsx`, `attributes-panel.tsx`, and `brands-panel.tsx` for this exact pattern. Wiring the Buyers screen to the same helpers would be a small, consistent fix (same shape as the Seller "After the fixes" section), not a new pattern.
- `BuyerMediaFor` is aliased to `AdminMediaFor` in `src/lib/accounts-api.ts`, but the screen passes a buyer-specific `MEDIA_FOR_OPTIONS` list (`nid`, `birth_certificate`, `profile_document`, `other`) into `DocumentsSection`, so the UI correctly only offers the four buyer-valid kinds even though the underlying type is shared with Seller's wider set. Worth double-checking server-side that the type alias doesn't let a seller-only value slip through client-side validation — the UI itself doesn't offer one, so this is a theoretical note, not an observed bug.
- Not checked (static review only, no live calls, no browser): actual list response under combined filters, actual 400 field-error text rendering for a `city`/`state` mismatch, and whether `pickChanged` on the Update page correctly diffs JSON array fields like `skills`/`experiences` byte-for-byte (a false "unchanged" would just mean no PATCH is sent, not a wrong one).
