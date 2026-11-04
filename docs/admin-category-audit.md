# Admin Category management: cross-check against the brief

Brief: `egoola-server/docs/prompt/admin/admin-category-management.md`, with the two backend guides it points to (`admin-category-api-guide.md`, `category-tree-api-guide.md`). Checked in real Chrome against the live backend, and by calling every endpoint directly. One small change was made afterwards (see the end).

## Brief versus what is built

| Brief item | Built | Verified |
|---|---|---|
| List with `type`, `status`, `search`, paging | Catalog, Categories tab, split into Product and Service tabs, with a search box, a status filter and Previous/Next | Yes |
| Create | "+ Add Category" modal: name, parent, sort order, status, image. Sent as multipart | Yes, with and without a parent |
| Edit (PATCH) | Same modal, filled from the list row | Yes |
| Delete, `409` if in use | Confirm, then the server's reason with a "Deactivate instead" button | Yes for a category used by a listing |
| Parent picker via tree | Searchable tree picker (`/tree/?type=&categoryName=`), a "No parent (top-level)" choice, the category itself left out, inactive ones marked | Yes |
| Breadcrumb via parent-chain | Parent column and a chain column ("A › B"), filled by one `/parent-chain/?categoryIds=` call per page | Yes |
| Fields | `type`, `name`, `slug` shown read-only, `parent`, `image` (upload, thumbnail in list), `sort_order`, `status` | Yes |
| No `GET /{id}/` | Not used. The edit form works from the list row | Yes (the API answers 405) |
| Admin token only | Signed-out visit goes to the admin login. The API gives 401 with no token and 403 with a buyer token | Yes |

## Live results

API contract: all pass except one.

- Create top-level and nested, duplicate name in the same type (400), same name in the other type (allowed), parent of another type (400), missing name (400), circular parent (400), rename regenerates the slug, detach with `null`, unknown id (404), detail GET (405), list filters, parent-chain order with unknown ids skipped, parent-chain with no ids (400), pruned tree, multipart create with an image and an empty parent.
- Delete of a category used by a listing: `409` with a readable reason, as the brief says.

Screen: all pass.

- Product and Service tabs show only their own type.
- The parent and chain columns show the right names.
- The status filter works.
- A new category made under a parent chosen in the picker lands under that parent.
- A duplicate name shows the server's message in the form.
- Delete of a used category shows the 409 reason and "Deactivate instead". Pressing it sets the status to inactive, and the API confirms.
- Delete of an unused category works.
- No page errors.

## One difference from the brief (backend)

The brief says a category with a sub-category cannot be deleted (`409`). Live, `DELETE` on a parent that has a sub-category answered `204` and also deleted the child. The `409` appears only when a listing uses the category or one of its sub-categories. So the screen's confirm text ("Delete category X? This cannot be undone.") does not warn that sub-categories go with it. This is the backend's to confirm. If the guide is right, the backend has a bug and an admin can wipe a branch by accident. If the behaviour is intended, the guide should say so, and I would add a warning to the confirm text.

## Smaller notes (frontend)

- Delete uses a browser `confirm` for the first question. The 409 part uses the in-page banner.
- The status and search controls have no labels.
- The page has no test record of its own before this one.

## Leftover test data

Five test categories named "Zcat…" could not be deleted, because test listings I created still use them (`409`). I could not find those listings through the listing list to remove them. They are harmless but visible in the Categories list until an admin removes the listings.

## After the audit

The delete confirm now says "Any sub-categories under it are deleted too", because that is what the backend does today (see the difference above). If the backend changes to refuse such a delete with a `409`, the screen already shows the server's reason and the "Deactivate instead" button, and the warning can be reworded then.
