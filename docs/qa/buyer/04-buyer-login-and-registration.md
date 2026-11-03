# QA Guide 4: Buyer Web, Registration and Login

This guide explains how a buyer creates an account and signs in. It covers every screen, every rule, every message and every test case, including odd ones. You do not need to read any code.

## 1. What this feature is

A buyer can **register** (create an account) and **sign in** (log in). Both are public. No account is needed to open them.

Key facts:

- **Registering also signs the buyer in.** There is no second "now log in" step after sign-up.
- The buyer signs in with **phone and password**. If the buyer gave an **email** at sign-up, the buyer can also sign in with **email and password**.
- A buyer who gave no email can only use the phone.
- Only three things are needed to register: **name, phone and password**. Everything else is optional.
- Every buyer-only page (cart, wishlist, jobs) needs a signed-in buyer. A signed-out visitor is sent to the login page and brought back after signing in.
- The access to the server is kept fresh in the background. The buyer should never notice it.

## 2. Where things are

| Screen | Address | Notes |
|---|---|---|
| Register | `/register` | Can be opened with `?next=/buyer/jobs` (or any buyer page) to come back there after sign-up |
| Login | `/login` | Has two tabs: **Buyer** and **Seller**. The Buyer tab is the default. `?next=` works here too. `?role=seller` opens the Seller tab |
| Buyer home | `/buyer` | Where a buyer lands when no return address was given |
| Seller register | `/seller/register` | A different feature. Not covered here |

The login page has a **Sign Up** link at the bottom. On the Buyer tab it goes to `/register` and keeps the return address. On the Seller tab it goes to `/seller/register`.

The register page has a **Sign in** link at the bottom. It keeps the return address too.

## 3. Words used

| Word | Meaning |
|---|---|
| Return address (`next`) | The page the buyer wanted before being sent to sign in. After signing in or registering, the buyer lands back there |
| Access token | A short pass kept in the browser. Valid for 1 hour |
| Refresh token | A longer pass used to get a new access token. Valid for 14 days. It changes every time it is used |
| Session | The two tokens plus the buyer's name, phone and email, kept in the browser |
| Generic message | One message that does not say which part was wrong |

## 4. The register screen

### 4.1 Always visible fields

| Field | Required | Rules |
|---|---|---|
| Full name | Yes | Cannot be empty |
| Phone (this is your login) | Yes | Digits only, 6 to 15 of them, may start with `+`. Spaces and hyphens are removed by the server (`+880 1711-000111` is saved as `+8801711000111`). Must not be used by another buyer |
| Password | Yes | At least 8 characters. Not a very common password. Not only digits. Has a show/hide eye button |
| Email (optional) | No | If given, must be a real email and not used by another buyer. Upper and lower case count as the same |

### 4.2 "More details" section (closed at first)

Click **More details** to open it. Everything here is optional.

| Field | Rules |
|---|---|
| Profile photo | One picture. JPG, PNG or WEBP. 5 MB or smaller |
| About you | Free text |
| Street address | Free text |
| Country, State, City, Thana | Drop-downs. Each one fills after the one above is picked. Picking a higher level clears the lower ones. Each level must belong to the one above it. Any level can be left empty. An empty Thana list is normal |
| Skills, Experience, Interests, Education | Free text. **One item per line.** Blank lines are ignored |

The section **opens by itself** if the server reports a mistake inside it, so the mistake is not hidden.

### 4.3 What happens when the buyer presses Create account

1. The screen checks that name, phone and password are filled, and that a chosen photo is a JPG, PNG or WEBP of 5 MB or less. If something is wrong, it shows the message at once and sends nothing.
2. The button changes to "Creating your account…" and cannot be pressed again.
3. If the server accepts, the buyer is signed in and taken to the return address, or to the buyer home.
4. If the server refuses, a red box at the top says "Please fix the highlighted fields and try again." and each problem is shown under its field. The screen scrolls to the box.

Notes on what is sent:

- Fields the buyer left empty are **not sent at all**. An empty email is the same as no email.
- If a photo is attached, the form is sent as a file upload. Otherwise it is sent as plain data. The buyer sees no difference.
- A failed sign-up leaves nothing behind: no account and no uploaded file.

### 4.4 Messages on the register screen

| Problem | Where it shows | Message |
|---|---|---|
| Name, phone or password empty | Under that field | This field is required. |
| Phone not valid | Under Phone | Enter a valid mobile number (digits only, may start with +). |
| Phone already used | Under Phone, plus a "Sign in instead" link in the red box | buyer with this phone already exists. |
| Email not valid | Under Email | Enter a valid email address. |
| Email already used | Under Email | buyer with this email already exists. |
| Password too weak | Under Password | One or more reasons, for example: This password is too short. It must contain at least 8 characters. / This password is too common. / This password is entirely numeric. |
| State not in the country, city not in the state, thana not in the city | Under the lower level | For example: This city does not belong to the selected state. |
| Photo wrong type | Under Profile photo | x.txt: only JPG, PNG or WEBP files are accepted. |
| Photo too big | Under Profile photo | name: the photo must be 5 MB or smaller. |
| Server not reachable | Red box | Couldn't reach the server. Check your connection and try again. |
| Any other server failure | Red box | Something went wrong. Please try again. |

If the server sends a mistake for a field the screen does not show, it is listed as a line inside the red box so it is never lost.

## 5. The login screen

### 5.1 Parts of the screen

- Two tabs: **Buyer** and **Seller**. Switching a tab clears the error and empties the account box (so an email never stays in the phone box).
- **Phone or email** box (Buyer tab) or **Phone number** box (Seller tab).
- **Password** box with a show/hide eye button.
- A "Forget Password?" link and a "Stay Signed In" tick box. See the known gaps in section 9.
- The **Sign In as Buyer** (or Seller) button. It reads "Signing in…" and is disabled while waiting.
- A **Sign Up** link.

### 5.2 How the screen decides phone or email

On the Buyer tab there is one box. If the text contains an `@`, it is sent as an **email**. Anything else is sent as a **phone**. Spaces at the start and end are removed. The server also ignores spaces and hyphens inside a phone number.

### 5.3 After signing in

- Buyer tab: the buyer goes to the return address, or the buyer home.
- Seller tab: the seller goes to `/seller`.
- A return address is used only if it is a page inside the buyer website (it must start with `/buyer`). Anything else, such as another website or `//evil.com`, is ignored and the buyer goes to the buyer home.

### 5.4 Opening the login or register page while already signed in

- A signed-in buyer who opens `/login` or `/register` is sent straight on to the return address or the buyer home. The form is not shown.
- A signed-in seller who opens `/login` is sent to `/seller`.

### 5.5 Messages on the login screen

| Problem | Message (shown in a red box above the fields) |
|---|---|
| Wrong password, or phone/email not known | Invalid phone number, email or password. |
| Suspended account | This account is not active. |
| Email used, but this buyer has no email | Invalid phone number, email or password. |
| Server not reachable | Couldn't reach the server. Please try again. |
| Box left empty | The browser's own "Please fill out this field" bubble. Nothing is sent |

The "wrong password" and "unknown account" messages are the **same on purpose**, so nobody can find out which numbers are registered. This is correct. Do not report it as a bug.

## 6. Keeping the buyer signed in

| Rule | What the buyer sees |
|---|---|
| The access token lasts 1 hour. When it runs out, the next request quietly gets a new one and tries again | Nothing. The page keeps working |
| Several requests failing at the same moment share **one** refresh | Nothing |
| The refresh token lasts 14 days and changes every time it is used. The new one is saved | Nothing |
| If the refresh also fails (expired, damaged, or the account was suspended) | The saved session is deleted and the buyer is sent to the login page with a return address. There is no loop |
| A "not allowed" (403) answer | Not a sign-out. The screen shows a "not allowed" state |

Where the session lives: the browser's local storage, under the name `egoola_auth_buyer`. It is shared by all tabs of the same browser. Closing the browser does not sign the buyer out.

## 7. Pages that need a signed-in buyer

The pages under the buyer account area (cart, wishlist, jobs, and the other account pages) check the session first. If there is none:

1. Nothing of the page is shown (no flash of private content).
2. The buyer is sent to `/login?next=<the page they wanted>`, including any filters in the address.
3. After signing in, or after registering from the login page's Sign Up link, the buyer lands on that page.

Public pages (browsing products, services, categories) do not need an account.

## 8. Test accounts and how to prepare

- Backend: `uv run manage.py runserver 8000`. Web: `npm run dev` (port 3000).
- Make as many accounts as you like by registering in the screen. Use a new phone number each time (for example `+88017` plus 8 random digits).
- A test password that passes the rules: `Buy@12345`.
- An existing buyer from the backend notes: `test.buyer@egoola.com` / `Test@12345`.
- To test a **suspended** buyer, an admin must suspend a buyer first (Admin website, buyers). If you cannot do this, mark cases AR-111, AR-112 and AR-158 as "not run".
- To test a **location**, use Bangladesh, then Chittagong, then Feni or Noakhali. In the test data, Dhaka has no cities, which is handy for the "city in another state" case.
- To test an **expired session**, open the browser developer tools, go to Application, Local Storage, and edit `egoola_auth_buyer`. Change `access` (and `refresh`) to any wrong text.

## 9. Known gaps (not bugs)

- **Forget Password?** goes to `/forgot-password`, which does not exist yet. It shows a not-found page.
- **Stay Signed In** does nothing. A signed-in buyer stays signed in either way.
- There is **no Sign out button** in the buyer website yet. To sign out in testing, delete `egoola_auth_buyer` from local storage. After switching accounts this way, a stale wishlist heart or cart count may stay until the page is reloaded.
- There is **no profile page**, so a saved profile cannot be checked on screen. Check the register response in the browser's Network tab.
- There is no email or phone verification. A new account is active at once.
- The seller tab only signs in an existing, approved seller. Seller registration is a different feature.

## 10. Test cases

Mark each case Pass or Fail. "Expected" is what you should see.

### 10.1 Register: the normal way

| ID | Steps | Expected |
|---|---|---|
| AR-01 | Open `/register`. Check the page | Heading "Create your Egoola account". Fields: Full name, Phone, Password, Email (optional). "More details" is closed. Name box has the cursor |
| AR-02 | Fill name, a new phone, password `Buy@12345`. Press Create account | Button shows "Creating your account…". Then the buyer home opens. The buyer is signed in |
| AR-03 | After AR-02, check local storage `egoola_auth_buyer` | Has `access`, `refresh`, the name, the phone, and `actor_type` is `buyer`. Email is empty |
| AR-04 | After AR-02, open `/buyer/jobs` | The jobs list opens. No sign-in asked |
| AR-05 | After AR-02, open `/register` again | Sent straight to the buyer home. The form does not show |
| AR-06 | Register with an email as well | Works. Local storage has the email |
| AR-07 | Register with a phone typed with spaces and hyphens, such as `+880 1711-000111` | Works. Signing in later with the same text works, and with `+8801711000111` too |
| AR-08 | Register with a phone with no `+`, such as `01711000111` | Works |
| AR-09 | Register with a 6-digit phone and a 15-digit phone | Both work |
| AR-10 | Register with a name that has spaces, numbers or Bangla letters | Works. The name shows as typed |
| AR-11 | Press Enter inside the password box | Same as pressing the button |
| AR-12 | Press the eye button next to the password | The password shows. Press again, it hides |
| AR-13 | Press Create account twice quickly | Only one account is made. The button is disabled after the first press |

### 10.2 Register: required and wrong values

| ID | Steps | Expected |
|---|---|---|
| AR-20 | Press Create account with everything empty | "This field is required." under Name, Phone and Password. Red box at top. Nothing is sent |
| AR-21 | Leave only the name empty | The message is under Name only |
| AR-22 | Leave only the phone empty | The message is under Phone only |
| AR-23 | Leave only the password empty | The message is under Password only |
| AR-24 | Name with only spaces | Treated as empty: "This field is required." |
| AR-25 | Phone `abc` | "Enter a valid mobile number (digits only, may start with +)." |
| AR-26 | Phone with 5 digits | Same message |
| AR-27 | Phone with 16 digits | Same message |
| AR-28 | Phone with a `+` in the middle, or letters mixed in | Same message |
| AR-29 | Phone already used by another buyer | "buyer with this phone already exists." under Phone. The red box has a "Sign in instead" link. Nobody is signed in |
| AR-30 | Same phone as AR-29 but typed with spaces or hyphens | Same "already exists" message |
| AR-31 | Password `12345` | The reasons are shown: too short, and it is all digits. All reasons appear, not only the first |
| AR-32 | Password `12345678` | Rejected: too common and/or all digits |
| AR-33 | Password `password` | Rejected as too common |
| AR-34 | Password of exactly 8 good characters, such as `Ab#4kd9Z` | Accepted |
| AR-35 | Password with spaces at the start or end | Accepted and kept exactly as typed. Sign in must use the same spaces |
| AR-36 | Email `abc` | "Enter a valid email address." (or the browser's own bubble if it shows first) |
| AR-37 | Email already used by another buyer | "buyer with this email already exists." under Email |
| AR-38 | Same email as AR-37 in capital letters | Same message. Upper and lower case are the same |
| AR-39 | Email box empty | Account is made with no email. Two buyers may both have none |
| AR-40 | After any error, fix the field and press the button again | Works. Old errors are cleared when the new request starts |
| AR-41 | Make an error, then press Create account again without fixing | The same error shows again. The page does not freeze |

### 10.3 Register: "More details"

| ID | Steps | Expected |
|---|---|---|
| AR-50 | Click "More details" | The section opens: photo, about, street address, country to thana, four list boxes |
| AR-51 | Click it again | The section closes. Anything typed inside is kept |
| AR-52 | Pick Bangladesh | The State list fills. State, City and Thana are empty |
| AR-53 | Pick a state | The City list fills |
| AR-54 | Pick a city | The Thana list fills (it may be empty, which is normal) |
| AR-55 | Pick all four levels, then change the Country | State, City and Thana clear |
| AR-56 | Pick country and state only, leave the rest | Account is made |
| AR-57 | Pick country only | Account is made |
| AR-58 | Pick nothing | Account is made |
| AR-59 | Open the page with the server stopped | A message says the country list could not be loaded. The rest of the form still works |
| AR-60 | Pick country Bangladesh, state Dhaka, then force a city of another state (needs a developer tool to change the request) | "This city does not belong to the selected state." under City. The section is open |
| AR-61 | Attach a PNG under 5 MB | Account is made. The register response has a `profile_pic_url` |
| AR-62 | Attach a JPG, then a WEBP | Both work |
| AR-63 | Attach a text file or a PDF | At once: "…only JPG, PNG or WEBP files are accepted." Nothing is sent |
| AR-64 | Attach a picture over 5 MB | At once: "…the photo must be 5 MB or smaller." Nothing is sent |
| AR-65 | Rename a text file to `x.png` and attach it | The server refuses it. The message shows under Profile photo and the section opens |
| AR-66 | Attach a photo, then press Cancel in the file box | The photo is removed. Account is made without a picture |
| AR-67 | Fill About you and Street address | Saved |
| AR-68 | Skills: type `react`, new line, `node`, a blank line, new line | Saved as two items: `react`, `node` |
| AR-69 | Fill Experience, Interests and Education the same way | Saved as lists |
| AR-70 | Leave all four list boxes empty | Not sent. Account is made |
| AR-71 | Fill everything: all fields, location, photo, lists | Account is made. The register response has all of them. The buyer is signed in |
| AR-72 | Make a mistake in the main fields while "More details" is closed and filled | The main field message shows. The filled details are not lost |
| AR-73 | Make a server mistake that belongs inside "More details" while it is closed | The section opens by itself |

### 10.4 Register: return address

| ID | Steps | Expected |
|---|---|---|
| AR-80 | Signed out, open `/buyer/jobs`. On the login page click Sign Up | Address is `/register?next=%2Fbuyer%2Fjobs`. The Sign in link at the bottom also keeps it |
| AR-81 | Register from AR-80 | Lands on `/buyer/jobs` |
| AR-82 | Open `/register?next=//evil.com` and register | Lands on the buyer home. Nothing leaves the site |
| AR-83 | Open `/register?next=https://example.com` and register | Lands on the buyer home |
| AR-84 | Open `/register?next=/seller` and register | Lands on the buyer home (not a buyer page) |
| AR-85 | Open `/register?next=/buyer/cart?type=service` and register | Lands on that cart page with the filter kept |

### 10.5 Login: the normal way

| ID | Steps | Expected |
|---|---|---|
| AR-90 | Open `/login` | Buyer tab is active. Title "Sign in". One account box, one password box. Cursor in the account box |
| AR-91 | Sign in with phone and password (account with no email) | Buyer home opens. Local storage has the session |
| AR-92 | Sign in with email and password (account that has one) | Works |
| AR-93 | Sign in with the phone typed with extra spaces at the ends | Works |
| AR-94 | Sign in with the phone typed with hyphens inside | Works |
| AR-95 | Sign in with the email in capital letters | Works (email is not case sensitive) |
| AR-96 | Press Enter in the password box | Same as the button |
| AR-97 | Press the eye button | The password shows and hides |
| AR-98 | Sign in, then check the header | Cart and Jobs links work. The cart count shows |

### 10.6 Login: wrong values

| ID | Steps | Expected |
|---|---|---|
| AR-100 | Right phone, wrong password | "Invalid phone number, email or password." No local storage entry |
| AR-101 | Phone that does not exist | The same message |
| AR-102 | Email that does not exist | The same message |
| AR-103 | Right email but the account has no email (typed an email it never gave) | The same message |
| AR-104 | Right email, wrong password | The same message |
| AR-105 | Leave the account box empty | The browser's "fill out this field" bubble. Nothing is sent |
| AR-106 | Leave the password empty | Same |
| AR-107 | Wrong password, then the right one | The red box clears and the sign-in works |
| AR-108 | Many wrong tries in a row | The same message each time. The screen stays usable |
| AR-109 | Check that no message says "wrong password" or "no such account" on its own | Correct. Only the one generic message |
| AR-110 | Sign in with the server stopped | "Couldn't reach the server. Please try again." The button works again |
| AR-111 | Suspended buyer, right password | "This account is not active." Not signed in |
| AR-112 | Suspended buyer, wrong password | Either message is acceptable. Note which you see |
| AR-113 | A seller's phone and password on the **Buyer** tab | Refused with the generic message |
| AR-114 | A buyer's phone and password on the **Seller** tab | Refused |
| AR-115 | Send both phone and email in one request to the server (developer tool or API) | 400: "Send either phone or email (one of them)." The screen never does this itself |

### 10.7 Login: tabs and links

| ID | Steps | Expected |
|---|---|---|
| AR-120 | Click the Seller tab | Box label changes to "Phone number". A hint about typing the number the same way shows. The sign-in button says "Sign In as Seller" |
| AR-121 | Type text, then switch tabs | The account box is empty. Any error is cleared |
| AR-122 | Open `/login?role=seller` | Seller tab is active |
| AR-123 | Sign in as a seller | Goes to `/seller` |
| AR-124 | Click Sign Up on the Buyer tab | Goes to `/register` |
| AR-125 | Click Sign Up on the Seller tab | Goes to `/seller/register` |
| AR-126 | Click "Forget Password?" | Known gap: not-found page |
| AR-127 | Tick or untick "Stay Signed In" | Known gap: no effect |
| AR-128 | Open the login page at phone width | The tabs and fields fit. No sideways scroll. The promo panel is hidden and the small logo shows |

### 10.8 Login: return address

| ID | Steps | Expected |
|---|---|---|
| AR-130 | Signed out, open `/buyer/cart`. Sign in | Lands on `/buyer/cart` |
| AR-131 | Signed out, open `/buyer/jobs/new`. Sign in | Lands on `/buyer/jobs/new` |
| AR-132 | Signed out, open `/buyer/jobs?status=draft`. Sign in | Lands on that page with the filter |
| AR-133 | Open `/login?next=//evil.com` and sign in | Lands on the buyer home |
| AR-134 | Open `/login?next=https://example.com` and sign in | Lands on the buyer home |
| AR-135 | Open `/login?next=/buyer` and sign in | Lands on the buyer home |
| AR-136 | Open `/login` with no `next` and sign in | Lands on the buyer home |
| AR-137 | Signed-in buyer opens `/login?next=/buyer/cart` | Sent straight to the cart. No form |
| AR-138 | Signed-in seller opens `/login` | Sent to `/seller` |
| AR-139 | Wishlist heart or Add to cart while signed out | Sent to login. After sign-in, back on the same page |

### 10.9 Staying signed in

| ID | Steps | Expected |
|---|---|---|
| AR-150 | Sign in, reload the page | Still signed in |
| AR-151 | Sign in, close the tab, open the site again | Still signed in |
| AR-152 | Sign in on two tabs | Both work. Signing in on one is seen by the other after a reload |
| AR-153 | Break the `access` text in local storage, then open `/buyer/jobs` | The page loads normally. Local storage now has a new `access`. No login page |
| AR-154 | Break both `access` and `refresh`, then open `/buyer/jobs` | Sent to `/login?next=%2Fbuyer%2Fjobs`. The saved session is deleted. No loop |
| AR-155 | After AR-154, sign in | Lands on `/buyer/jobs` |
| AR-156 | Break only `access`, then open a page that makes many requests at once (cart, with the header count) | Works. Only one refresh happens (check the Network tab). The `refresh` text changes once |
| AR-157 | Delete `egoola_auth_buyer`, then use a buyer page | Sent to login with a return address |
| AR-158 | Suspend the buyer in the Admin website, break `access`, then use a buyer page | The refresh is refused. Sent to login. Signing in again says "This account is not active." |
| AR-159 | Sign in as a buyer and as a seller in the same browser | Both work. The two sessions are kept apart (`egoola_auth_buyer` and `egoola_auth_seller`) |

### 10.10 Guarded pages

| ID | Steps | Expected |
|---|---|---|
| AR-160 | Signed out, open `/buyer/cart` | Sent to `/login?next=%2Fbuyer%2Fcart`. No cart content flashes |
| AR-161 | Signed out, open `/buyer/favourites` | Sent to login |
| AR-162 | Signed out, open `/buyer/jobs` and `/buyer/jobs/new` | Sent to login |
| AR-163 | Signed out, open `/buyer/jobs/5` | Sent to login (not a not-found page) |
| AR-164 | Signed out, open `/buyer/products`, `/buyer/services`, `/buyer/categories` | Opens. No account needed |
| AR-165 | Signed in as a seller only, open `/buyer/cart` | Sent to the buyer login |
| AR-166 | Signed out, check the header | Jobs link goes to login. Account links go to login |

### 10.11 Safety and odd cases

| ID | Steps | Expected |
|---|---|---|
| AR-170 | Type a script or HTML in the name, such as `<b>x</b>` | Saved as plain text. Nothing runs. It shows as typed |
| AR-171 | Very long name (200+ characters) | Either accepted or a clear server message. No crash |
| AR-172 | Very long password (100+ characters) | Accepted or a clear message |
| AR-173 | Paste a phone with an invisible space or a tab | Handled. Either works or shows the phone message |
| AR-174 | Use the browser Back button after registering | Goes back to the page before the form. The register form does not break. Opening `/register` again sends the buyer on |
| AR-175 | Press Back after signing in | Goes to the page before login. Since the buyer is signed in, `/login` sends them on again |
| AR-176 | Refresh the page while the error box is open | The form is empty again. No account was made |
| AR-177 | Look at the Network tab during sign-up | The request is `POST /auth/buyer/register/` with no Authorization header. The password is not in the address |
| AR-178 | Look at the response of a sign-up | 201 with `access`, `refresh`, the profile, and "Welcome to Egoola. Your account is ready." No password |
| AR-179 | Try to send `status`, `wallet_balance` or `email_verified_at` in the request (developer tool) | Ignored. The new buyer is active with an empty wallet |
| AR-180 | Keyboard only: Tab through the register form and submit | Every field and button can be reached and used |
| AR-181 | Open both forms in a narrow window (about 360 px wide) | Fields stack. No sideways scroll |
| AR-182 | Slow network: sign-up takes several seconds | The button stays disabled. No double account |

## 11. Reporting a bug

Please write down:

1. The case ID.
2. Which screen and which address you were on.
3. The exact values you typed (do not share real passwords).
4. What you expected and what you saw. Add a screenshot.
5. For a failed sign-up or sign-in: the status number and the reply from the Network tab.

Server mistakes that look wrong (for example a wrong message, or a rule that is not kept) are for the backend team. Say so in the report.
