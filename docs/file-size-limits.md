# File size limits (all web apps)

One rule for every upload in the admin, seller, buyer and public pages:

| File | Limit |
|---|---|
| Images | 2 MB |
| Videos | 10 MB |
| Any other file (PDF and so on) | 30 MB |

A file is an image or a video by the type the browser reports. When the browser gives no type, the file name's extension decides. Anything else counts as "other".

## Where it lives

`src/lib/file-limits.ts` is the only place the numbers are written. `fileSizeProblem(file)` returns the message ("photo.png is 2.5 MB. Images can be up to 2 MB.") or null. `takeFile` and `takeFiles` are for the `onChange` of a file input: they refuse an oversized file at once, empty the input and show the message. The submit-time checks that already existed (seller sign-up documents, buyer sign-up photo, listing files) call the same function.

## What was changed

The old limits were different (5 MB for sign-up photos and documents, 10 MB for listing thumbnails and seller gallery files, and none for several admin pickers). They are gone and replaced by the rule above.

Every one of the 12 file inputs now checks at the moment the file is chosen: admin category image, banner image, site logo, payment gateway icon, admin profile pictures (buyers, admins), admin documents, seller profile photo and documents, seller sign-up photo and documents, buyer sign-up photo, and the listing and gig thumbnail and gallery. Hints next to the pickers show the new limits.

## Checked in Chrome

Image 2.5 MB refused and 1.9 MB accepted, video 11 MB refused and 9 MB accepted, PDF 31 MB refused and 25 MB accepted, on the buyer and seller sign-up pages, the category, gateway, site logo and admin buyer forms, and the listing thumbnail and gallery.

## Not covered or to know

- The server has its own limits and stays the authority. If it is stricter (for example 5 MB for sign-up documents), a 25 MB PDF passes this check and is then refused by the server with its own message. Ask the backend to match the 2, 10 and 30 MB rule.
- Only the size is limited here. Type checks (which formats are accepted) are unchanged.
- The buyer product pages upload no files, so nothing changes there.
