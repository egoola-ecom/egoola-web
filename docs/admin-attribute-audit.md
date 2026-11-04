# Admin Attributes and Attribute Values: cross-check

Guide: `egoola-server/docs/admin/admin-attribute-api-guide.md`. Checked in real Chrome against the live backend and by calling every endpoint, on throwaway data. The one gap found was fixed afterwards (see the end).

## Guide versus what is built

| Guide item | Built | Result |
|---|---|---|
| Attribute list with `name`, `is_active`, `search` (English or Bangla) | Search box (English or Bangla) and a status filter; each row shows its values | Pass |
| Create attribute (`name`, `name_bn`, `description`, `description_bn`) | Add Attribute dialog. After saving, the dialog stays open in edit mode so values can be added at once | Pass |
| Name unique in any case, blank name refused | Server message shown in the form | Pass |
| Retrieve with nested `values` | `getAttribute` exists in the client but the screens do not call it (the list already nests the values) | Fine |
| PATCH / PUT, `values` ignored | PATCH only, with the attribute's own fields | Pass |
| Delete attribute also deletes its values; 409 when a SKU uses it | Confirm text says "and all its values". 409 shows the server's reason and "Deactivate instead" | Pass |
| Value fields and create under an attribute | Values section in the attribute dialog: add, edit, activate or deactivate, delete | Pass |
| Value name unique within its attribute, same name allowed under another attribute | Duplicate shows "This attribute already has a value with this name." | Pass |
| Value under an inactive attribute refused (400) | The Add value button is disabled, with "Activate the attribute to add values" | Pass |
| `attribute` cannot change after creation | The edit form never sends it | Pass |
| Value delete 409 when a SKU uses it | Banner with "Deactivate instead" | Pass (API checked) |
| Admin token only | Signed-out visit goes to the admin login. 401 with no token and 403 with a buyer token | Pass |
| Seller lookup `/seller/lookups/attributes/` | Used by the seller screens, unchanged | Fine |

## Live results

API: all 20 checks pass, including the 409 messages for a value and an attribute used by a listing SKU, the 400 for a changed `attribute`, and optional text sent as `null` (what the form sends).

Screen: pass for the list, Bangla search, the inactive filter, creating an attribute and staying in the dialog, adding, editing, deactivating, activating and deleting a value, the duplicate-value message, the disabled Add value on an inactive attribute, and no page errors.

## One gap (frontend), now fixed

**More than 100 values were cut off.** The Values section asked the server for 100 values once and never asked for the next page. An attribute with 105 values showed only 100 in the edit dialog, so 5 could not be seen, edited or deleted there.

Fixed: the section now loads every page (`listAllAttributeValues` follows the server's `next` link). Checked in Chrome with an attribute of 105 values: all 105 show, the last one has Edit and Delete, deleting it works and the list then shows 104. A small attribute still shows its values. In the dev server the requests appear twice (React Strict Mode runs each effect twice); the pages asked for are offset 0 and offset 100.

## Smaller notes

- Delete uses a browser confirm dialog for the first question.
- The attribute list has no total number of values per row; it prints them all in one line, which is long for a big attribute.
- One test attribute named "Zattr …" could not be deleted because a test listing still uses it.
