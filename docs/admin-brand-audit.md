# Admin Brands: cross-check and image

Brief: `egoola-server/docs/admin/admin-brand-api-guide.md`. Checked in real Chrome against the live backend.

## Cross-check before the change

| Guide item | State |
|---|---|
| List with `search`, `is_active`, paging | Built |
| Create (`name`, `is_active`), duplicate name 400 | Built, the server message shows in the form |
| Update (rename, deactivate) | Built |
| Delete with 409 when a listing uses the brand | Built: the banner shows the server's reason with "Deactivate instead" |
| No detail call (405) | Not used |
| Admin token only | Signed-out visit goes to the admin login. API: 401 with no token, 403 with a buyer token |
| `image` (write-only) and `image_path` / `image_url` | **Missing.** The screen sent plain JSON and ignored the image fields |
| Seller lookup `/seller/lookups/brands/` (no image) | Used by the seller screens, unchanged |

## What was added

- `BrandItem` has `image_path` and `image_url`. `BrandInput` has an optional `image`.
- Create and update are sent as multipart, with `is_active` always included (the guide warns that a missing value in form data reads as false).
- The list shows a logo thumbnail beside the name.
- The add and edit form has a logo box with a preview, "Choose logo" or "Replace logo", the visible line "Image files only. Maximum size 2 MB.", and the global size check (a file over 2 MB is refused at once with its size and the limit). A server image error shows under the box.
- A save that picks no new file keeps the current logo.

## Results

All pass: create without a logo (active stays true), duplicate name message, 2.5 MB logo refused, small logo accepted and shown as a thumbnail, edit opens with the current logo, replacing changes the stored file, rename keeps the logo and regenerates the slug, deactivate, the active filter, delete of a used brand gives the 409 banner and "Deactivate instead" works, the seller lookup carries no image, no page errors. `tsc` and `eslint` are clean.

## Notes

- A logo can be replaced but not removed: the server refuses `image: null` (400, "This field may not be null"). The guide says nothing about removing one.
- The guide says the server refuses images over 2 MB, the same as the new global limit.
- One test brand ("Zbr … used") could not be deleted because the test listing that uses it is still there.
