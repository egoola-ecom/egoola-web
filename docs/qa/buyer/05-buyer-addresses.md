# QA Guide 5: Buyer Web, Address Book

This guide explains how a buyer saves, edits and deletes delivery addresses. It covers every screen, every rule, every message and every test case, including odd ones. You do not need to read any code.

## 1. What this feature is

The **address book** is a short list of delivery addresses that a buyer has saved. At checkout (not built yet) the buyer will pick one of them. This screen is where the buyer manages them.

- A buyer can **add**, **edit** and **delete** addresses.
- Every address belongs to one buyer. A buyer can only see and change their own.
- There is **no paging**. Every address is shown on one page, newest first.
- The same form is meant to be used at checkout later, for "add a new address".
- Deleting an address does **not** change any order placed before. An order keeps its own copy of the address.

## 2. Where things are

| Place | Address | Notes |
|---|---|---|
| Address book | `/buyer/addresses` | Signed-in buyers only |
| Menu entry | Account side menu, "My Addresses" | Goes to the login page first when signed out |

There is no separate page for the form. It opens at the top of the address book, above the cards.

## 3. The address fields

| Field | Required | Rules |
|---|---|---|
| Recipient name | Yes | The person who receives the order. Not necessarily the buyer |
| Phone | Yes | The recipient's phone. The server does not check the format |
| Address line 1 | Yes | House, road |
| Address line 2 | No | Flat, floor, landmark |
| Zip code | No | |
| Country | Yes | Chosen from a list |
| State | Yes | The list fills after the country is picked |
| City | Yes | The list fills after the state is picked |
| Thana | Yes | The list fills after the city is picked |

Unlike a job, an address needs **all four** location levels. Each level must belong to the one above it (the state in the country, the city in the state, the thana in the city). Changing a level empties the levels below it.

## 4. The screen

### 4.1 Address book

- Heading "My addresses" and an **Add address** button.
- One card per address: recipient name, the two address lines, the place (thana, city, state, country), the zip after a dash, and the phone.
- Each card has **Edit** and **Delete**.
- A buyer with no addresses sees "You have no saved addresses yet." and an "Add your first address" button.
- While loading, "Loading…" shows. If loading fails, "We couldn't load your addresses. Please try again."

The place names come with each address from the server. If the server sends none for a level, that level is left out of the card instead of showing a number.

### 4.2 The form

- Title "Add address" or "Edit address".
- Fields in the order: recipient name and phone (side by side), address line 1, address line 2 and zip (side by side), then Country, State, City, Thana.
- Buttons **Save address** (or **Save changes**) and **Cancel**. While saving the button reads "Saving…" and cannot be pressed again.
- A red box at the top says "Please fix the highlighted fields and try again." when the server finds a problem. Each problem also shows under its own field.
- When a city has no thanas, a note says "No thanas are listed for this city yet." The thana is required, so the address cannot be saved for that city yet (see known gaps).
- Pressing **Cancel** closes the form and keeps nothing.

### 4.3 What the form sends

- **Add:** every filled field. Address line 2 and zip are left out when empty.
- **Edit:** only the fields that changed. Saving with no change sends nothing and just closes the form.
- Emptying address line 2 or zip on an edit is allowed and clears it.
- Emptying a location level on an edit is sent as "no value", and the server refuses it.

### 4.4 Delete

- **Delete** on a card opens a yellow box on that card: "Delete this address? It is removed from your address book for good. Orders you already placed are not changed."
- **Yes, delete** removes it. **Keep it** closes the box.
- Only one card shows the box at a time. Opening Edit or another Delete closes any message.

## 5. Messages

| Problem | Where it shows | Message |
|---|---|---|
| A required text field left empty | Under that field | This field may not be blank. (or: This field is required.) |
| A location level not picked | Under that picker | Select a country. / Select a state. / Select a city. / Select a thana. |
| City not in the state (or similar) | Under the picker named by the server | This city does not belong to the selected state. |
| Thana not in the city or state | Under Thana | This thana does not belong to the selected state. (or a similar message) |
| Address already gone (deleted somewhere else) | Red box above the list | We couldn't find that address. It may already be deleted. The list then refreshes |
| Not signed in or session ended | None | Sent to the login page, then back here |
| Any other failure | Red box | Something went wrong. Please try again. |

A server message for a field that the screen does not show is listed as a line under the red box, so it is never lost.

## 6. Test accounts and preparation

- Backend: `uv run manage.py runserver 8000`. Web: `npm run dev` (port 3000).
- Make a fresh buyer in the register screen for the "empty list" cases. Password example: `Buy@12345`.
- Location test data that works: **Bangladesh**, **Chittagong** (state), **Feni** or **Noakhali** (city). Dhaka has no cities in the test data, so it is handy for "state without cities" cases.
- Some thanas in the test database came from backend smoke tests. Their names look like "Smoke Addr Thana". That is normal.
- To test a second buyer, register another one in a private window.

## 7. Known gaps (not bugs)

- There is no checkout yet, so nothing uses the saved addresses.
- There is no "default address" and no limit on how many addresses a buyer can save.
- The phone has no format check. The server accepts any text.
- A city with no thanas cannot be saved, because the thana is required.
- The address book is not in the top bar. It is in the Account side menu (My Addresses).
- No separate page shows one address. Edit is the only detail view.

## 8. Test cases

Mark each case Pass or Fail. "Expected" is what you should see.

### 8.1 Opening the screen

| ID | Steps | Expected |
|---|---|---|
| AD-01 | Signed out, open `/buyer/addresses` | Sent to `/login?next=%2Fbuyer%2Faddresses`. After sign-in, you land on the address book |
| AD-02 | Sign in as a new buyer, open the address book | "You have no saved addresses yet." and the "Add your first address" button. The Add address button is also at the top |
| AD-03 | Open the Account side menu while signed in | "My Addresses" is there and opens the screen |
| AD-04 | Open the Account side menu while signed out | "My Addresses" goes to the login page |
| AD-05 | Stop the server, then open the screen | "We couldn't load your addresses. Please try again." |
| AD-06 | Open the screen as a buyer who has several addresses | All cards show. Newest first |
| AD-07 | Reload the page | Same list |
| AD-08 | Open the screen on a phone-width window | Cards stack. Nothing runs over the footer. No sideways scroll |

### 8.2 Adding an address

| ID | Steps | Expected |
|---|---|---|
| AD-10 | Click Add address | The form opens above the list. The Add address button hides |
| AD-11 | Fill every field and pick all four levels. Press Save address | The form closes. The new card is at the top. It shows name, lines, place, zip and phone |
| AD-12 | Same, but leave address line 2 and zip empty | Saved. The card shows only line 1, the place and the phone |
| AD-13 | Add two addresses one after the other | The second one is on top |
| AD-14 | Add an address with a name that has spaces, numbers or Bangla letters | Saved as typed |
| AD-15 | Add an address with spaces around the values | The spaces at the ends are removed |
| AD-16 | Phone typed with a plus sign, with hyphens, or only digits | All saved as typed |
| AD-17 | Press Save address twice quickly | Only one address is made. The button is disabled after the first press |
| AD-18 | Click Cancel after typing | The form closes. Nothing is saved. Opening Add again shows an empty form |
| AD-19 | Open Add, fill some fields, then press Edit on a card | The form changes to that card's edit form. The typed text is gone |

### 8.3 Adding: wrong or missing values

| ID | Steps | Expected |
|---|---|---|
| AD-20 | Press Save address on an empty form | A red box at the top. An error under every empty field. Under each picker "Select a …" |
| AD-21 | Fill everything except address line 1 | An error under Address line 1 only. Nothing saved |
| AD-22 | Leave the recipient name empty | An error under Recipient name |
| AD-23 | Leave the phone empty | An error under Phone |
| AD-24 | Address line 1 with only spaces | Treated as empty. Error under it |
| AD-25 | Pick the country only | "Select a state.", "Select a city.", "Select a thana." under their pickers |
| AD-26 | Pick country and state only | "Select a city." and "Select a thana." |
| AD-27 | Pick country, state and city but no thana | "Select a thana." |
| AD-28 | Pick a city that has no thanas | The note "No thanas are listed for this city yet." shows. Saving gives "Select a thana." (known gap) |
| AD-29 | The State picker before a country is chosen | Disabled |
| AD-30 | The City picker before a state is chosen | Disabled |
| AD-31 | The Thana picker before a city is chosen | Disabled |
| AD-32 | Pick all four levels, then change the Country | State, City and Thana are emptied |
| AD-33 | Pick all four levels, then change the State | City and Thana are emptied. Country stays |
| AD-34 | Pick all four levels, then change the City | Thana is emptied |
| AD-35 | Fix the errors and press Save again | Old messages clear. The address is saved |
| AD-36 | A very long line 1 (300+ characters) | Saved, or a clear message from the server. No crash |
| AD-37 | Type HTML such as `<b>x</b>` in a field | Saved and shown as plain text. Nothing runs |
| AD-38 | Make the server answer that a city does not belong to the state (needs a developer tool to change the request) | "This city does not belong to the selected state." under the right picker. Nothing is saved |
| AD-39 | Stop the server and press Save | A red message appears. The typed values stay in the form |

### 8.4 Editing

| ID | Steps | Expected |
|---|---|---|
| AD-40 | Press Edit on a card | The form opens with every field filled, including all four pickers (give the lists a second to load) |
| AD-41 | Change only address line 1 and save | Saved. Name, phone, location, line 2 and zip are unchanged. (In the Network tab the request holds only `address_line1`) |
| AD-42 | Change only the recipient name | Only the name changes |
| AD-43 | Change only the phone | Only the phone changes |
| AD-44 | Clear address line 2 and save | Line 2 is empty on the card |
| AD-45 | Clear the zip and save | The zip is gone from the card |
| AD-46 | Add a zip to an address that had none | The zip shows on the card |
| AD-47 | Change the country to another one, then pick a full new chain | Saved with the new place |
| AD-48 | Change only the thana within the same city | Only the thana changes |
| AD-49 | Change the state and pick a full new chain below it | Saved |
| AD-50 | Change the state but leave city and thana empty, then save | "Select a city." and "Select a thana." Nothing changes on the server |
| AD-51 | Open Edit and press Save without changing anything | The form closes. No request is sent (Network tab) |
| AD-52 | Open Edit, change something, press Cancel | Nothing is saved. The card is as before |
| AD-53 | Edit an address, then press Edit on another card | The form shows the other address |
| AD-54 | Edit an address after it was deleted somewhere else | "We couldn't find that address. It may already be deleted." |
| AD-55 | After an edit, reload the page | The change is still there |
| AD-56 | Edit makes the address move in the list? | No. The order stays newest-created first (check this and note what you see) |

### 8.5 Deleting

| ID | Steps | Expected |
|---|---|---|
| AD-60 | Press Delete on a card | A yellow box on that card asks to confirm and says orders already placed are not changed |
| AD-61 | Press Keep it | The box closes. The card stays |
| AD-62 | Press Yes, delete | The card disappears. If it was the last one, the empty message shows |
| AD-63 | Delete, then reload | Still gone |
| AD-64 | Press Delete on one card, then Delete on another | The first box closes. Only one box is open |
| AD-65 | Press Delete, then Edit on the same card | The delete box is gone and the form opens |
| AD-66 | Delete an address that was already deleted elsewhere | "We couldn't find that address. It may already be deleted." The list refreshes |
| AD-67 | Delete the only address | Empty state with "Add your first address" |
| AD-68 | Press Yes, delete twice quickly | Only one request is sent. No second error |
| AD-69 | Stop the server, press Yes, delete | A red message appears. The card stays |

### 8.6 Two buyers and sign-in

| ID | Steps | Expected |
|---|---|---|
| AD-70 | Buyer A saves an address. Buyer B opens the address book | B does not see A's address |
| AD-71 | With B's token, call the API to read A's address id (developer tool) | 404, not 403 |
| AD-72 | With B's token, call delete on A's address id | 404. A's address is still there |
| AD-73 | With B's token, call edit on A's address id | 404. Nothing changes |
| AD-74 | No token: call the list API | 401 |
| AD-75 | Delete `egoola_auth_buyer` from local storage, then press Save in an open form | Sent to login. After sign-in you are on the address book |
| AD-76 | Break the access token in local storage, then press Save | Works. The token is renewed quietly |
| AD-77 | Break access and refresh tokens, then press Save | Sent to the login page with a return address |

### 8.7 Odd cases

| ID | Steps | Expected |
|---|---|---|
| AD-80 | Save an address, then press the browser Back button | Goes to the page before the address book. No error |
| AD-81 | Open the screen in two tabs. Add in one, then reload the other | The second tab shows the new address after a reload |
| AD-82 | Save an address with a country, state and city whose names are long | The card wraps. Nothing runs outside the card |
| AD-83 | Look at the Network tab when adding | `POST /buyer/addresses/` with the buyer token. No password or other private data |
| AD-84 | Look at the response of a list call | A plain list (no `results`, no `count`) |
| AD-85 | Keyboard only: Tab through the form and submit with Enter | Every field and button can be reached and used |
| AD-86 | The product list filters (Country, Division, District, Thana drop-downs) | Still work as before. The address form changes did not affect them |
| AD-87 | Slow network: the geography lists load slowly | The pickers fill when ready. Nothing breaks |
| AD-88 | Add 20 addresses | All 20 show on one page. No paging |

## 9. Reporting a bug

Please write down:

1. The case ID.
2. The address you were on and which screen.
3. The values you typed (do not share real private data).
4. What you expected and what you saw. Add a screenshot.
5. For a failed save or delete: the status number and the reply from the Network tab.

Server messages that look wrong are for the backend team. Say so in the report.
