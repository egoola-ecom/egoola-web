# Listing files (thumbnail and gallery): test record

Brief: the backend moved the files of products and gigs out of the listing API.
Create and update of a listing or gig are JSON only (multipart is `415`), the old
`.../thumbnail/` calls are gone, and four multipart APIs carry the files:

| Who | Add | Change |
|---|---|---|
| Admin | `POST /catalog/listing-files/{id}/` | `PATCH /catalog/listing-files/{id}/` |
| Seller (own listings) | `POST /seller/listing-files/{id}/` | `PATCH /seller/listing-files/{id}/` |

Run on 2026-10-15 in a real browser (Chrome driven by a script) against a local backend
with a throwaway database. Test ids: seller product 61, seller gig 62, admin product 64,
admin gig 65.

## What changed in the web app

- `src/lib/listing-files-api.ts` (new): `addFiles` and `changeFiles` for both roles, the
  limits, and the client checks. The old `putListingThumbnail`, `syncListingMedia` and
  their gig and seller twins are removed.
- `src/components/listing-files-control.tsx` (new): one control for the thumbnail and the
  gallery. On create forms it only holds the picked files. On detail and edit pages it
  collects what the user changes (new thumbnail, removed thumbnail, removed gallery files,
  added files) and sends it as one `PATCH` with a "Save files" button, separate from the
  form's Save button. A removal asks for a confirmation when saving.
- Create flows: the listing is saved as JSON first, then the files are added with the new
  id. If the files are refused the listing is kept and its edit page opens with the reason
  (`?filesError=`) so the user can retry.
- Edit pages (admin and seller, product and gig): a Files card above the form. The seller
  edit form now has the full control (it had none before).
- Detail pages: the control replaces the old thumbnail control.
- The "changing the thumbnail sends the listing back for review" confirmation and hints are
  gone: files never change the status. The status shown is the one the server returns.
- `ListingForm` and `GigForm` no longer carry gallery state, media limits or the thumbnail
  handlers.

## Cases

| # | Case | Expected | Result |
|---|---|---|---|
| 1a | Seller creates a product with a thumbnail and 2 gallery files | `POST /seller/listings/` as JSON, then `POST /seller/listing-files/{id}/` as multipart; picture and 2 files shown | Pass |
| 1b | Same for a seller gig | Same two requests | Pass |
| 1c | Create, but the server refuses the thumbnail (fake `.png`) | Listing exists; edit page opens with the reason and the Files card | Pass |
| 1d | Retry from that edit page with a good picture | Saved on the same listing | Pass |
| 1-admin | Admin creates a product and a gig with files | JSON create, then `POST /catalog/listing-files/{id}/` | Pass |
| 2 | Second thumbnail through the add call (crafted, the UI never offers it) | `400 {"thumbnail": [...]}` | Pass |
| 3 | Choose a new thumbnail, press Save files | One `PATCH`, new picture, old file gone (404) | Pass |
| 4 | Remove the thumbnail only | One `PATCH`, "No thumbnail", gallery kept | Pass |
| 5 | Remove 1 gallery file, add 2 in the same save (seller product, admin product, admin gig) | One request, gallery count right | Pass |
| 6a | `.txt` and `.exe` in the gallery | Refused on the page, nothing sent | Pass |
| 6b | Fake `.png` in the gallery | The brief expects `400` | **Server accepts it** (see Backend notes) |
| 6c | Fake `.png` as the thumbnail | Server `400`, shown under the thumbnail, nothing saved | Pass |
| 6d | Discard after a refused save | Back to the saved thumbnail | Pass |
| 7a | 11 files at once (seller) | 10 queued, "at a time" message | Pass |
| 7b | Add those 10 | Saved | Pass |
| 7c | Go to 20 files, then add one more | The extra file is refused on the page ("up to 20 files") | Pass |
| 7d | A file over 10 MB | Refused on the page | Pass |
| 7e | 11 files in one request (crafted) | `400 {"media_file": ["Upload at most 10 files at a time."]}` | Pass |
| 8 | Remove an id that belongs to another listing (crafted) | `400 {"remove_media_ids": [...]}`, nothing removed | Pass |
| 9 | Seller changes the thumbnail of a rejected listing | No prompt; status stays `rejected` | Pass |
| 10 | Seller then saves the form ("Save and send for review") | `PATCH` as JSON only; status becomes `pending` | Pass |
| 11 | Admin changes files of a product and of a gig | One `PATCH`; status unchanged; change log row with `thumbnail` and `media` | Pass |
| 12 | Multipart to the listing JSON API (crafted, seller listing and admin gig) | `415` both | Pass |
| 13 | Another seller's id on the seller files API; the same id on the seller edit page | `404`; "We couldn't find this listing" | Pass |

Also checked: `npx tsc --noEmit` and `npx eslint src` are clean.

Not covered in a browser: a `403` from a seller who cannot operate (the seller area
already locks those screens, see `docs/seller-smoke-tests.md`), and a video (`.mp4`) in
the gallery (the type is allowed by the client check and shown with a player by
`MediaPreview`).

## Backend notes (not changed here)

- **A fake `.png` is accepted in the gallery.** A text file named `.png` sent as
  `media_file` gets `200` and is stored; it shows as a broken picture. The thumbnail does
  check that the file is a real image (`400 "This file is not a valid image."`). The
  brief's case 6 and the audit prompt expect `400` for a fake `.png` in the gallery;
  `listing-complete-guide.md` section 15 says "a real image" only for the thumbnail. The
  seller documents upload has the same gap.
- A seller who already has 20 files gets the message from the client check, so the
  server's 20-per-listing message was not seen in the browser.
