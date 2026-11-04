# Admin Geography: audit

Scope: the admin Geography screen (`/admin/geography`, four tabs: Countries, States, Cities, Thanas), its API client `src/lib/geography-api.ts`, and the backend guide `egoola-server/docs/admin/geography-api-guide.md`. Checked with real Chrome (Playwright) against the live backend, on throwaway rows that were deleted afterwards. The findings below were then fixed (see "After the fixes").

## Results

| # | Check | Result |
|---|---|---|
| A1 | Create a country | Pass. 201 with a server-made slug and code |
| A2 | Duplicate country name (case and spaces ignored) | Pass. 400 on `name` |
| A3 | `GET /geography/countries/{id}/` | Pass. 405, as the guide says |
| A4-A6 | Create state and city; duplicate state | Pass. Duplicate gives 400 on `name` |
| A7 | City with a state that is not in the country | Pass. 400 on `state` |
| A8 | Thana with a state that is not in the country | Pass. 400 on `state` (not on `city`) |
| A9 | Create a thana | Pass |
| A10 | No token | Pass. 401 |
| A11 | Delete a country | Pass. 204 and its thanas are gone too (cascade) |
| U0 | Signed out | Pass. Goes to the admin login |
| U1 | Search a country | Pass |
| U2 | Duplicate country in the form | Pass. The server message shows in the modal |
| U3, U4 | Create and edit a country in the screen | Pass. The slug changes with the name |
| U5 | Delete a country | Pass, through a browser confirm that warns states, cities and thanas go too |
| U6, U7 | Duplicate state and duplicate city | Pass. Message shown |
| U10 | Reload | The page returns to the Countries tab (the tab is not in the address) |
| U11 | Page errors | None |
| **U8** | Thana create when the server answers `{"state": [...]}` | **Fail.** The modal shows no message at all |
| **U9** | Filter drop-downs on the Thanas tab | **Fail.** They have no accessible label |

## Findings

1. **A real error is hidden (Thanas form).** The server reports a country/state mismatch under `state`. The Thana form shows messages only for `name` and `city`, so the buyer of that error sees a form that does nothing. The cascading drop-downs make the mismatch hard to produce by hand, but it can happen when another admin changes data in between. The Cities form shows `state` and the States form shows `country`, so only Thanas has the gap. The fix is to show `state` and `country` messages in the Thana form.
2. **Delete uses browser dialogs and hides the reason.** All four tabs use `window.confirm` and `window.alert`. A failed delete always says "Couldn't delete this X. Please try again." and never the server's reason. The newer admin screens use a modal. This is a style gap and a small usability gap, not a data bug.
3. **No labels on the filters.** The country, state and city filters on the Thanas tab (and the similar ones on Cities) are `select` elements with no label or `aria-label`. Screen readers announce them as "combo box" only, and tests cannot find them by name.
4. **The tab is not in the address.** A reload or a shared link always opens Countries.
5. **Repeated code.** The four panels (about 1,380 lines) repeat the same sign-out handling, delete handling, form and paging. Changes such as the fixes above have to be made four times.
6. **Not offered by the backend yet** (as the guide says): flag images and bulk import. The screen correctly offers neither.

## Matches the guide

Endpoint paths, the plain-id writes against nested reads, server-made slug and code, parent-scoped duplicate names, search, filters by parent id, limit/offset paging, and the 405 on detail.

## Not tested

- Editing a city or thana to move it to another parent.
- Paging past one page of rows, and the page-size control.
- A seller or buyer token against the geography API (only "no token" was run).
- Narrow screens.

## Suggested fixes, in order

1. Show `state` and `country` errors in the Thana form (finding 1).
2. Add `aria-label` to the filter selects (finding 3).
3. Replace the browser dialogs with the modal used on Payment Gateways, showing the server's reason (finding 2).
4. Keep the active tab in `?tab=` (finding 4).
5. Pull the shared panel code into one place (finding 5), once the fixes above are in.

## Delete of a place that is still used (extra check)

On throwaway rows, a country, state, city and thana were used by a buyer address, an order made from it and a product listing. Deleting the thana, the city and the country each answered `500` with an HTML error page (`ProtectedError`). Nothing was lost: the address, the order and the listing kept their place names. Only the delete failed, with no message. This is for the backend to fix: catch the error and answer `400` or `409` with a JSON reason. Until then the screen says what it most likely means.

## After the fixes

Done in the web app, and checked again in Chrome:

1. The Thana form now shows `country`, `state` and `city` messages, and the City form shows `country` and `state`. A `{"state": [...]}` answer now appears in the form.
2. The filter drop-downs on States, Cities and Thanas have names ("Filter by country", "Filter by state", "Filter by city").
3. Delete uses an in-page dialog, not browser dialogs. It keeps the cascade warning. When a delete is refused it stays open with the server's reason, or, for the `500` above, "This X is probably still used by saved addresses, orders or listings, so it cannot be deleted. Nothing was changed." Only Close is offered after a refusal. "Keep it" deletes nothing.
4. The tab is in the address (`/admin/geography?tab=cities`), so a reload or a shared link opens the same tab. An unknown tab opens Countries.

Not done: merging the repeated panel code (finding 5). It is only worth doing when the panels change again.
