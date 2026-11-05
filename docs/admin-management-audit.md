# Admin Management: cross-check against the brief

Brief: `egoola-server/docs/prompt/admin/admin-management.md` (and `admin-management-guide.md`). Checked in real Chrome against the live backend as the super-admin (`test.super@egoola.com`) and the plain admin (`test.admin@egoola.com`), on throwaway admins that were deleted afterwards. The one gap found was fixed afterwards (see the end).

## Brief versus what is built

| Brief item | Built | Result |
|---|---|---|
| Super-admin only (401 no token, 403 seller/buyer/plain admin) | The Admins menu entry and the whole `/admin/admins` section are hidden or replaced by "Only a super-admin can access Admin Management" for a plain admin | Pass. API: 401, 403, 403, 403 |
| List with `type`, `status`, `search`, paging | Search box, role filter, status filter, Previous/Next. Rows show name, email, mobile, role, status, last login | Pass |
| Create (JSON or multipart) | Add Admin dialog, sent as multipart, with profile picture, address, location, skills, interests, experience, education and documents | Pass. Duplicate email and weak password messages show |
| Retrieve (full record and media) | Admin Details page | Pass |
| Update (PATCH) | Update page, which sends only the fields that changed | Pass |
| Delete | Delete button with a confirm | Pass |
| Cannot change own type or status (400) | On your own edit page, Role and Status are locked with "You can't change your own role/status". Unchanged fields are not sent | Pass |
| Cannot delete yourself (400) | Your own row says "(you)" and has no Delete button | Pass |
| Role and status changes | Role and Status selects on the edit page (not toggles in the list). Promote, demote and deactivate work and take effect at once | Pass |
| Password rules | Browser check for at least 8 characters and not all digits, plus the server's messages | Pass |
| Profile picture set or replace (2 MB) | Choose photo, with the visible 2 MB hint. A 2.5 MB file is refused at once | Pass |
| Profile picture remove (`remove_profile_pic`) | Remove photo and Undo remove on the edit page (added after this audit) | Pass |
| Documents: add (`media_for` + `media_file`) and remove (`media_delete_ids`) | Documents section: add rows with a type, remove existing ones. A file over 30 MB is refused at once | Pass |

## Live results

API (all pass): 401, 403 for a buyer and a plain admin, create (multipart) 201 and active by default, duplicate email and mobile 400, short, all-digit and common passwords 400, bad type 400, filters, retrieve with media, promote then demote, own type change 400 ("You cannot change your own admin type."), own status change 400, delete own account 400, set a profile picture, `remove_profile_pic` clears it, add a document. Re-sending your own unchanged type and status is accepted (200).

Screen (all pass except the gap): the "(you)" row, no Delete on yourself, search, role filter, create, duplicate-email message, detail page, role and status enabled for others and locked for yourself, the PATCH carrying only the changed fields, picture and document limits, adding and removing a document, deleting another admin, and the locked page for a plain admin. No page errors.

## The gap, now fixed

**An admin's profile picture could be set and replaced but not removed.** The backend supports `remove_profile_pic=true` for admins, buyers and sellers (checked live on each: it clears the picture back to empty).

Fixed in the shared picture field, so the admin, buyer and seller edit pages all get it:

- When a record has a picture, the button reads "Replace photo" and a **Remove photo** button appears. Remove only marks it: the preview empties and the line "The photo is removed when you save." shows, with an **Undo remove** button. Nothing is sent until Save.
- Choosing a new file after marking removal cancels the removal, since the new picture wins (as on the server).
- A create form has no Remove button. A record with no picture shows "Choose photo" only.
- Saving without touching the picture sends no picture field, so it stays.
- The existing picture now shows on the edit page. Before, the preview used a path that does not resolve in the browser.

Checked in Chrome for each of the three roles: the current picture loads, Remove and Undo, choosing after Remove, save clears the picture on the server and the request carries `remove_profile_pic`, then "Choose photo" with no Remove. A rename that leaves the picture alone keeps it. `tsc` and `eslint` are clean.

## Notes

- Role and status are changed on the edit page, not by toggles in the list.
- Delete uses a browser confirm dialog.
- Not tested: location fields on an admin, experience and education entries, and a plain admin opening a detail address directly (the section's locked page covers it).
