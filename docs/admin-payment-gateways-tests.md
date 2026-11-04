# Admin Payment Gateways: browser test results

Brief: `egoola-server/docs/prompt/admin/frontend-admin-payment-gateway-prompt.md`. Run with `next dev` on port 3000 and the Django backend on port 8000, using real Chrome driven by Playwright, signed in as the test admin.

## What was built

- `src/lib/admin-payment-gateways-api.ts`: `listGateways`, `createGateway`, `updateGateway`, `deleteGateway`. Create and update send JSON, or multipart when an icon is attached. The slug is never sent.
- `src/app/(admin)/admin/(protected)/payment-gateways/`: the list screen with a search box, an Active/Inactive filter, a page-size selector (10, 20, 50, 100) with Previous/Next, an inline Active switch on each row, and an Add/Edit form in a dialog.
- The form has a name field, an icon uploader that previews the current icon and lets it be replaced, and the slug shown read only once the gateway exists.
- Delete asks for confirmation. If the server refuses with 400, a message says the gateway is still in use and offers "Deactivate instead".
- The admin menu has a new **Payment Gateways** entry after Wishlists.

## Results for the 9 cases in the brief

| # | Case | Result |
|---|---|---|
| 1 | List on a fresh dev DB | Pass. Cash on Delivery shows, active, no icon |
| 2 | Create "Postman Gateway" with no icon | Pass. Created, slug `postman-gateway-...` |
| 3 | Create it again with the same name | Pass. "payment gateway with this name already exists." under Name |
| 4 | Rename it | Pass. The slug follows the name. No slug input exists |
| 5 | Upload an icon on edit | Pass. `icon_url` is set, the thumbnail renders, and editing shows the current icon. A non-image file is refused on the form |
| 6 | Toggle it inactive | Pass. The inline switch sends the change at once. Filter Active hides it, filter Inactive shows it |
| 7 | Delete it | Pass. A confirm dialog appears first. Cancel keeps the row. Confirm removes it |
| 8 | Delete a gateway that is in use | Pass, with a mocked 400 (see below). The message says it is still in use and offers "Deactivate instead", which works. No raw error text |
| 9 | Non-admin | Pass. No token gives 401, a buyer token gives 403 at the API, and a signed-out visit to the page goes to the admin login |

Also checked: search by slug, the page-size selector, and no page errors in the console. `tsc` and `eslint` are clean.

## Notes for the backend

- Case 8 could not be reproduced for real. Cash on Delivery is not referenced by any payment in the test database, so the server **deleted it** with 204. The 400 path was tested by answering the delete request with a 400 in the browser. A real in-use delete needs a payment that points to a gateway, and no order or checkout exists yet.
- Because of that, the seeded Cash on Delivery row (id 1) was removed from the throwaway database. It was recreated through the API, so it now has a new id (11). The brief says the seed is id 1.
- Deleting a gateway that no payment uses is allowed, including the seeded default. The server does not protect Cash on Delivery.
- The 400 for an in-use delete is a list of text in the sample. The screen does not depend on its wording.
- The list rows also carry `updated_at`, which the brief does not list.
