# Buyer addresses: browser test results

Brief: `egoola-server/docs/prompt/buyer/frontend-buyer-address-prompt.md`. Run with `next dev` on port 3000 and the Django backend on port 8000, using real Chrome driven by Playwright. Test buyers were created through the registration API.

## What was built

- `src/lib/buyer/buyer-addresses-api.ts`: `listAddresses`, `getAddress`, `createAddress`, `updateAddress` (PATCH), `deleteAddress`, and `addressProblem` which turns a failed call into field messages and one general message.
- `src/components/shop/addresses/address-form.tsx`: the create and edit form. It does not know the page around it and reports back through `onSaved` and `onCancel`, so checkout can reuse it for "add a new address".
- `src/components/shop/addresses/addresses-screen.tsx`: the address book at `/buyer/addresses` (page under `src/app/(buyer)/buyer/(account)/addresses/`). Cards show recipient, address lines, the place names, zip and phone. Delete asks first, inline.
- `src/components/shop/browse/geo-select.tsx`: new `form` mode with labels, full-size drop-downs, a message under each level and a note when a city has no thanas. The filter drop-downs on the product and service lists are unchanged.
- A "My Addresses" entry in the buyer account menu.

Rules in the form:

- All four location levels are required (the server says so).
- Name, phone and address line 1 are required. The server judges every rule and its message is shown under the field it names.
- Editing sends only the fields that changed. A level the buyer emptied is sent as null so the server reports it missing. Saving without any change sends nothing.
- A message of "required" or "may not be null" on a location drop-down is shown as "Select a city." (or country, state, thana).

## Results for the 7 cases in the brief

| # | Case | Result |
|---|---|---|
| 1 | Fresh buyer, open the address book | Pass. Empty state with "Add your first address" |
| 2 | Create one with all fields | Pass. It appears at the top. The card shows the recipient, both address lines, thana, city, state, country, zip and phone |
| 3 | Create one missing address line 1 | Pass. The server's 400 shows under Address line 1 ("This field may not be blank."). An empty form shows an error under every empty field |
| 4 | City that does not belong to the chosen state | Pass. "This city does not belong to the selected state." shows under City, nothing is saved. The mismatch was made by changing the request in the browser, because the drop-downs cannot produce it |
| 5 | Edit just address line 1 | Pass. The request body was only `{"address_line1": ...}` and every other field is unchanged on the server |
| 6 | Delete one | Pass. A confirm box says past orders are not changed. "Keep it" keeps the card, "Yes, delete" removes it |
| 7 | No token | Pass. Signed-out visit goes to `/login?next=%2Fbuyer%2Faddresses`. The API answers 401 with no token |

## Extra checks

- The newest address is shown first.
- The edit form opens with all four levels filled in.
- Saving an edit with no change sends no request and closes the form.
- Clearing address line 2 and zip works.
- Changing the state empties city and thana in the form. Saving then shows "Select a city." and "Select a thana." under them.
- Deleting an address that is already gone (deleted from another place) shows "We couldn't find that address. It may already be deleted." and refreshes the list.
- Another buyer's address id gives 404 for both read and delete.
- The product and service filter drop-downs still work.
- No page errors in the console. `tsc` and `eslint` are clean.

## Found and fixed while testing

- The first version of the card list used the Bootstrap `h-100` class. The card was cut short and its text spilled over the footer, so the Delete confirmation could not be clicked. Removing `h-100` fixed it.
- Changing only the state on an edit made the server say "This city does not belong to the selected state" under City, because the emptied city was not sent. Emptied levels are now sent as null.

## Notes for the backend

- A blank text field gives "This field may not be blank." and a missing one gives "This field is required." Both are fine, but the wording differs.
- Sending a location level as null gives "This field may not be null." The form turns this into "Select a ...".
- Fixed by the backend: each address now carries `country_name`, `state_name`, `city_name` and `thana_name` beside the ids. The address book uses them and makes no geography calls for names. The edit form still loads the geography lists, but only to fill its drop-downs.
- A city may have no thanas, but a thana is required. A buyer in such a city cannot save an address. The form shows a note, and the backend may want to allow an empty thana for those cities.
- The test database has leftover thanas from backend smoke tests (for example "Smoke Addr Thana" under Feni).
