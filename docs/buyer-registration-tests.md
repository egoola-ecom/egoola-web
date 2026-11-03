# Buyer registration: browser test results

Brief: `egoola-server/docs/prompt/buyer/frontend-buyer-auth-prompt.md`. Run against `next dev` on port 3000 and the Django backend on port 8000, with real Chrome driven by Playwright. Test accounts were created through the registration API or the form itself.

## What was built

- `src/lib/buyer/buyer-auth-api.ts`: `registerBuyer(input)`. Plain JSON, or multipart when a photo is attached. Empty optional fields are left out of the request, not sent as empty strings. On success it saves the session under the `buyer` key, so the buyer is signed in at once.
- `src/app/(public)/register/`: the `/register` page and form. Name, phone and password are up front. Email, photo, about, street address, country to thana, and the four free-form lists sit in a collapsed "More details" section. The section opens by itself when the server reports an error inside it.
- `src/components/seller-form/location-fields.tsx`: new `optional` prop, so the buyer form can ask for country, state and city without requiring them. The seller form is unchanged.
- `src/app/(public)/login/login-form.tsx`: the buyer "Sign Up" link now keeps the `next` return address.

Login, the token refresh retry, and the route guard already existed from the earlier buyer work, so they were tested here but not rebuilt.

## Results for the 13 cases in the brief

| # | Case | Result |
|---|---|---|
| 1 | Register with only name, phone, password | Pass. Signed in at once, lands on the buyer home, the token works on a buyer API call |
| 2 | Same phone again | Pass. The message "buyer with this phone already exists." shows under Phone, with a "Sign in instead" link |
| 3 | Weak password | Pass. Every reason the server gives is shown under Password |
| 4 | City that does not belong to the state | Pass. "This city does not belong to the selected state." shows under City |
| 5 | Register with a profile picture | Pass. Multipart succeeds, `profile_pic_url` is filled, and location, description and lists are saved |
| 6 | Log in with phone and password | Pass |
| 7 | Log in with email and password | Pass |
| 8 | Both phone and email in one request | Pass at API level (400). The login form sends only one of them by design |
| 9 | Wrong password | Pass. One generic message: "Invalid phone number, email or password." |
| 10 | Suspended buyer | Not run. No suspended buyer exists in the test data |
| 11 | Expired access token | Pass. A bad access token is refreshed silently, the page stays where it was |
| 12 | Expired access and refresh token | Pass. Sent to the login page with a return address, tokens cleared, no loop |
| 13 | Buyer-only route while signed out | Pass. Redirected to `/login?next=...`. After sign-up or sign-in the buyer lands back on that route |

## Extra checks

- Duplicate email, in different letter case: the field message shows.
- Blank name, bad phone number: messages show on the form.
- A non-image file as the photo is refused on the form before any upload.
- A signed-in visitor who opens `/register` is sent away to the buyer home.
- A crafted `?next=//evil.com` is ignored; the buyer lands on the buyer home.
- No page errors in the browser console.
- `tsc` and `eslint` are clean.

## Notes for the backend

- There is no `GET /buyer/profile/` yet, so the saved profile could only be checked from the register response itself.
- Only the Chittagong division has cities in the test data, so the location test uses Feni and Noakhali. Dhaka has none.
