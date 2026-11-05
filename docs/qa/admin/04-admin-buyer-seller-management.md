# QA README: Admin, Buyer and Seller Management, and Seller Verification

This guide lets a tester check every screen, rule, message and odd case of four areas:

- **Admins:** the admin accounts (super-admin only).
- **Buyers:** the buyer accounts.
- **Sellers:** the seller list, create, view, update and delete.
- **Seller verification:** the Seller Request queue, the Review panel (Verification, Account status, Access), the history, and what the seller sees after login.

You do not need to read any code. Every case says what to do and what you should see. Cases marked **(edge)** are the odd ones. Cases marked **(observe)** record what the system does today and may be reported as a defect, see section 7.

---

## 0. Before you start

### Accounts

| Who | Login | Use |
|---|---|---|
| Super-admin | `test.super@egoola.com` / `Test@12345` | Section 1 (Admins) and the "who can open it" checks |
| Plain admin | `test.admin@egoola.com` / `Test@12345` | Sections 2, 3 and 4 |
| Test seller | You create it (see 0.2). Login is the **phone number** plus the password you set | Section 5 |
| Test buyer | You create it in section 2 | Access checks |

Admin login page: `http://localhost:3000/admin/login`.
Seller sign-up: `http://localhost:3000/seller/register`.
Seller and buyer login page: `http://localhost:3000/login` (choose the seller role, or open `/login?role=seller`).

Do not guess passwords. Use only the accounts above and the ones you create.

### Test data rules

- Start every name you create with **`QA-`** and your initials, for example `QA-ES Rafiq`.
- Use a fresh phone number and email for every record. Phone format: `+8801XXXXXXXXX`. Never re-use one; deleted numbers may stay blocked.
- Password for records you create: `Strong#Pass9` (at least 8 characters, not only digits, not a common password).
- Do not edit or delete data that does not start with `QA-`.
- A seller or buyer that already has an order **cannot be deleted** (that is a checked case, see 3.9 and 2.8). Do not put orders on your test data unless you are running those cases.

### 0.1 Where things are

| Area | Address | How to reach it |
|---|---|---|
| Admins | `/admin/admins` | Left menu **Admins** (shown to a super-admin only) |
| Buyers | `/admin/buyers` | Left menu **Buyers** |
| Sellers | `/admin/sellers` | Left menu **Sellers**, then **Seller List** |
| Seller Requests | `/admin/sellers/requests` | Left menu **Sellers**, then **Seller Requests**. A number badge shows how many sellers wait |
| Seller detail | `/admin/sellers/{id}` | **View Details** on a row |
| Seller update | `/admin/sellers/{id}/edit` | **Update** on the detail page |

Buyers and Admins work the same way: list, **View Details**, **Update** (`/admin/buyers/{id}/edit`, `/admin/admins/{id}/edit`).

### 0.2 Make a test seller quickly

Most verification cases need a seller in a certain state. Two ways to get one:

1. **Self-registered (waiting for review):** open `/seller/register`, fill name, email, phone, password, present and permanent address, country, state, city, thana, and at least one NID file, then submit. The page says "Thanks, we've got your registration". The seller is **Unverified**, **Inactive**, and **in the queue**.
2. **Admin-created (already approved):** on the Seller List press **Add Seller**, fill the form (section 3.3). The seller is **Verified** and not in the queue. Its account status is whatever you chose.

To reach other states, use the Review panel (section 4). The table in 4.1 shows which states exist.

### 0.3 Things that are the same on every list

- **Search box:** waits a moment after you stop typing, then filters. Clearing it shows everything again.
- **Paging:** "Page 1 of 3 — 52 total" with **Previous** and **Next**, disabled at the ends. With no rows: "0 results".
- **Empty list:** "No sellers found." (or buyers, admins).
- **Loading:** "Loading…" while it fetches.
- **Add** opens a dialog. **Cancel** or X closes it without saving. A save error stays inside the dialog and keeps what you typed.
- **Messages come from the server** and show under the field they belong to, or in a red bar.
- **Session ends in the middle:** the next action sends you to the admin login page.
- **Row buttons:** **View Details** and **Delete**. Delete asks a browser confirm first. Cancel in the confirm deletes nothing.

### 0.4 File rules (all pickers)

Images up to **2 MB**, videos up to **10 MB**, any other file up to **30 MB**. Documents may be JPG, PNG, WEBP or PDF. A file over the limit or of the wrong type is refused at once with the file name in the message, and the picker empties.

Files to prepare: a small PNG (about 300 KB), a PNG of about 1.9 MB, a PNG of about 2.5 MB, a small PDF, and a text file renamed to `.png`.

### 0.5 How to read the cases

`ID | Steps | Expected`. Mark each Pass or Fail. If something fails, note the exact text on screen, the time, and what you typed.

---

## 1. Admins (super-admin only)

Log in as the **super-admin**.

### 1.1 Who can open it

| ID | Steps | Expected |
|---|---|---|
| AD-1 | As super-admin, look at the left menu | **Admins** is listed |
| AD-2 | Log in as the **plain admin** and look at the menu | **Admins** is not listed |
| AD-3 (edge) | As the plain admin, open `/admin/admins` directly | A locked page: "Only a super-admin can access Admin Management". No list |
| AD-4 (edge) | Sign out, open `/admin/admins` | Goes to the admin login |

### 1.2 List

| ID | Steps | Expected |
|---|---|---|
| AD-5 | Open Admins | Columns: Name, Mobile, Role, Status, Last login. Your own row says "(you)" |
| AD-6 | Type part of a name, email or mobile in the search box | List narrows to matches |
| AD-7 | Filter by role: All roles, Super Admin, Admin | Only that role shows |
| AD-8 | Filter by status: All statuses, Active, Inactive | Only that status shows |
| AD-9 | Combine search with a filter | Both apply |
| AD-10 (edge) | Look at your own row | **No Delete button** on your own row |

### 1.3 Create

Press **Add Admin**.

| ID | Steps | Expected |
|---|---|---|
| AD-11 | Fill name, email, mobile, password `Strong#Pass9`, role **Admin**. Press **Create Admin** | Dialog closes, the admin is in the list, status **Active** |
| AD-12 | Create a **Super Admin** | Works. Role shows Super Admin |
| AD-13 (edge) | Use an email that already exists | The server message shows under the email field. Nothing is created |
| AD-14 (edge) | Use a mobile that already exists | The server message shows. Nothing is created |
| AD-15 (edge) | Password `short1` | Browser or server message: at least 8 characters |
| AD-16 (edge) | Password `12345678` (only digits) | Refused: not only digits |
| AD-17 (edge) | Password `password123` (common) | Refused by the server with its message |
| AD-18 | Add a profile picture of 300 KB | Preview shows |
| AD-19 (edge) | Pick a 2.5 MB picture | Refused at once: "<name> is 2.5 MB. Images can be up to 2 MB." Picker empties |
| AD-20 | Add skills `A, B`, interests, a work experience entry and an education entry | Saved. They show on the detail page |
| AD-21 | Add a document (type **NID**, a small PDF) | Saved. Shows on the detail page |
| AD-22 (edge) | Add a document over 30 MB | Refused at once |

### 1.4 View, update, delete

| ID | Steps | Expected |
|---|---|---|
| AD-23 | Press **View Details** on the admin you made | Header with name and badges, then the profile, address, skills, experience, education and documents |
| AD-24 | Press **Update**, change only the name, **Save Changes** | Saved. Only the name changes |
| AD-25 | On another admin's edit page, change **Role** to Super Admin, save, then back to Admin | Both changes take effect |
| AD-26 | On another admin's edit page, set **Status** to Inactive, save | Status shows Inactive in the list |
| AD-27 (edge) | Open **your own** edit page | Role and Status are locked, with the hints "You can't change your own role." and "You can't change your own status." |
| AD-28 | On your own edit page, change only the name | Saves. The role and status are not sent, so no error |
| AD-29 | Leave password blank on edit | Password stays. The hint says "Leave blank to keep the current password." |
| AD-30 | Type a new password on edit, save, then log in as that admin | New password works, old one does not |
| AD-31 | With a picture set, press **Remove photo** | Preview empties, the line "The photo is removed when you save." shows, with **Undo remove** |
| AD-32 | Press **Undo remove** | Picture comes back |
| AD-33 | Press **Remove photo**, then choose a new file | The removal is cancelled, the new picture wins |
| AD-34 | Press **Remove photo**, save | Picture is gone. Edit page shows **Choose photo** only |
| AD-35 | In Documents, remove one document and add another, save | Removed one is gone, new one shows |
| AD-36 | Press **Delete** on the admin you made, confirm | Admin is gone from the list |
| AD-37 | Press **Delete**, then Cancel in the confirm | Nothing is deleted |
| AD-38 (edge) | Log in as the deactivated admin (AD-26) | Cannot log in or cannot use the admin area |

---

## 2. Buyers

Log in as the **plain admin**.

### 2.1 List

| ID | Steps | Expected |
|---|---|---|
| BY-1 | Open Buyers | Title "Buyers". Columns: Name (email under it), Phone, Status, Wallet |
| BY-2 | Search by name, email and phone, one at a time | List narrows |
| BY-3 | Filter Status: All statuses, Active, Suspended | Only that status shows |
| BY-4 | Filter "Email: any / Email verified / Email not verified" | Works. Everyone is "not verified" until the OTP feature exists, so "verified" gives 0 results |
| BY-5 | Filter "Phone: any / Phone verified / Phone not verified" | Same as BY-4 |
| BY-6 | Use the signed-up date range | Only buyers who signed up in the range |
| BY-7 | Use country, state, city and thana filters | Cascade (the state list follows the country). Only matching buyers |
| BY-8 | Combine several filters and search | All apply together |

### 2.2 Create

Press **Add Buyer**.

| ID | Steps | Expected |
|---|---|---|
| BY-9 | Fill name, email, phone, password `Strong#Pass9`, status Active. **Create Buyer** | Buyer appears in the list |
| BY-10 | Create a buyer with the **email left empty** | Works. The label says "Email (optional)". The row shows no email |
| BY-11 (edge) | Duplicate email, then duplicate phone | Server messages show under the field. Nothing is created |
| BY-12 (edge) | Short, all-digit and common passwords | Refused with a message |
| BY-13 | Fill address, country, state, city, thana | Saved and shown on the detail page |
| BY-14 (edge) | Choose a city that is not in the chosen state (only possible if data changes in between) | The server message shows in the form |
| BY-15 | Add skills, interests, work experience, education | Saved |
| BY-16 | Add a document. The type list offers exactly: NID, Birth Certificate, Profile Document, Other | Saved. There is no Certificate, Gallery Image or Gallery Video here |
| BY-17 | Add a profile picture; try 2.5 MB | 300 KB works; 2.5 MB is refused at once |

### 2.3 View

| ID | Steps | Expected |
|---|---|---|
| BY-18 | **View Details** | Avatar, name, email, phone, status badge, wallet. Buttons: **Carts**, **Wishlist**, **Suspend** (or **Activate**), **Update** |
| BY-19 | Read the profile card | Email and phone "verified at" (or "Not verified"), wallet, description, address, location, skills, interests, experience, education, documents |
| BY-20 | Press **Carts** | Opens the admin carts page filtered to this buyer |
| BY-21 | Press **Wishlist** | Opens the admin wishlists page filtered to this buyer |

### 2.4 Status

| ID | Steps | Expected |
|---|---|---|
| BY-22 | On the detail page press **Suspend** | Status badge becomes suspended at once. The button now reads **Activate** |
| BY-23 | Press **Activate** | Back to active. Button reads **Suspend** |
| BY-24 | Log in as that buyer while suspended (buyer login page) | Cannot use the buyer site (login refused or restricted). Note exactly what happens **(observe)** |
| BY-25 | On the edit page the Status select has exactly two options: Active, Suspended | There is no Inactive and no verification setting for buyers |

### 2.5 Update

| ID | Steps | Expected |
|---|---|---|
| BY-26 | **Update**, change only the name, **Save Changes** | Only the name changes |
| BY-27 | Change a skill, a work-experience entry | The change is saved and shows |
| BY-28 | Leave password blank | Unchanged |
| BY-29 | Set a new password, log in as the buyer | New password works |
| BY-30 | Clear the email on an existing buyer, save | Allowed |
| BY-31 | Remove photo, Undo, choose-after-remove, save | Same behaviour as AD-31 to AD-34 |
| BY-32 | Remove a document and add another | Works |

### 2.6 Access

| ID | Steps | Expected |
|---|---|---|
| BY-33 (edge) | Sign out and open `/admin/buyers` | Goes to the admin login |
| BY-34 (edge) | Log in as a buyer on the buyer site, then open `/admin/buyers` | Cannot use the admin area |

### 2.7 Delete

| ID | Steps | Expected |
|---|---|---|
| BY-35 | Delete a buyer with **no orders**, confirm | Buyer is gone |
| BY-36 | Press Delete and Cancel in the confirm | Nothing is deleted |

### 2.8 Delete when the buyer has an order (edge)

Needs a buyer who has placed an order (use the buyer site, or an existing buyer you were told to use).

| ID | Steps | Expected |
|---|---|---|
| BY-37 | Press **Delete** on that buyer, confirm | The delete is refused. A red bar shows the server's reason: "This buyer has one or more orders. Suspend the account instead of deleting." with **Suspend instead** and **Dismiss** |
| BY-38 | Press **Dismiss** | Bar goes away. Buyer unchanged |
| BY-39 | Repeat and press **Suspend instead** | Buyer becomes suspended, bar goes away, list refreshes |
| BY-40 (edge) | Try to delete an already suspended buyer who has an order | The bar shows the reason with **Dismiss** only (no Suspend instead) |

---

## 3. Sellers (list, create, view, update, delete)

Log in as the **plain admin**.

### 3.1 List

| ID | Steps | Expected |
|---|---|---|
| SL-1 | Open **Seller List** | Title "Sellers". Columns: Name (email under it), Phone, Verification, Status, Wallet, Signed up. A seller in the queue has an amber **Request** tag beside the name |
| SL-2 | Check the badges | Verification: Unverified, Pending, Verified or Rejected. Status: Active, Inactive or Suspended |
| SL-3 | Search by name, email and phone | List narrows |
| SL-4 | Filter "All verification statuses" through Unverified, Pending, Verified, Rejected | Only that status shows |
| SL-5 | Filter "All statuses" through Active, Inactive, Suspended | Only that status shows |
| SL-6 | Filter who created the account: "Self-registered", "Created by an admin" | Matches how you made them (0.2) |
| SL-7 | Filter "Seller Request queue: any / In the queue / Not in the queue" | Splits by queue. This filter is on the Seller List only |
| SL-8 | Filter "Email verified" and "Phone verified" | Everyone is "not verified" until OTP exists, so "verified" gives 0 results |
| SL-9 | Filter "Business profile: any / Has a business profile / No business profile" | Splits correctly |
| SL-10 | Type a business type such as `Retail` | Only matching sellers (any letter case) |
| SL-11 | Use the signed-up date range | Only sellers who signed up in the range |
| SL-12 | Use country, state, city, thana | Cascade. Only matching sellers |
| SL-13 | Combine several filters with search | All apply together |
| SL-14 | Use **Clear filters** | Everything returns |
| SL-15 | Page through, if more than one page | Previous and Next work; the count matches |

### 3.2 Menu badge

| ID | Steps | Expected |
|---|---|---|
| SL-16 | Note the number beside **Seller Requests** | Equals the number of sellers "In the queue" in SL-7 |
| SL-17 | Self-register a new seller (0.2) and reload the admin page | The number goes up by one |
| SL-18 | Approve or reject a queued seller (section 4) | The number goes down by one at once, without a reload |

### 3.3 Create

Press **Add Seller**.

| ID | Steps | Expected |
|---|---|---|
| SL-19 | Fill name, email, phone, password, status, address, country, state, city, thana, one NID. **Create Seller** | Seller appears. **Verified**. No **Request** tag. Not in the queue |
| SL-20 | Check the hint on the phone field | It says the phone is the seller's login |
| SL-21 (edge) | Duplicate email, then duplicate phone | Server message shows. Nothing is created |
| SL-22 (edge) | Weak passwords (short, all digits, common) | Refused |
| SL-23 | Tick **Include business profile** | The Business profile section appears. Required: business type, main product, owner name, employees range, annual revenue, established year. Optional: description, public email and others |
| SL-24 (edge) | Tick it but leave a required business field empty | Browser asks for it; if you bypass, the server lists the missing fields |
| SL-25 | Fill all business fields, create | Saved. Shows on the detail page and in the filter "Has a business profile" |
| SL-26 | Add documents of all six kinds: NID, Birth Certificate, Certificate, Gallery Image, Gallery Video, Other | All saved |
| SL-27 (edge) | Wrong file type (text file renamed `.png`), a 2.5 MB picture, a document over 30 MB | Each refused at once with a message |
| SL-28 | Choose a status other than Active when creating | A Verified seller can be Active, Inactive or Suspended |

### 3.4 View

| ID | Steps | Expected |
|---|---|---|
| SL-29 | **View Details** | Header: name, email, phone, badges (verification, account status, **Seller request** if queued), wallet and bonus. Button **Update** |
| SL-30 | Look down the page | Order: Review panel, Documents, Profile, Profile change history |
| SL-31 | Documents card | Each document has its type and a link that opens it in a new tab |
| SL-32 | Profile card | Address, location, skills, interests, experience, education, business profile |

### 3.5 Update

| ID | Steps | Expected |
|---|---|---|
| SL-33 | **Update**, change only the name, **Save Changes** | Only the name changes |
| SL-34 | Change the phone | The hint warns it is the login. After saving, the seller logs in with the **new** number; the old number fails |
| SL-35 | Leave password blank | Unchanged |
| SL-36 | Set a new password, then log in as the seller | New one works |
| SL-37 | Add the business profile to a seller that had none | Saved |
| SL-38 | Edit one business field | Saved. The change history shows only that field, before and after |
| SL-39 | Remove photo, Undo, choose-after-remove, save | Same behaviour as AD-31 to AD-34 |
| SL-40 | Add and remove documents of every kind. As admin you may also change NID and Birth Certificate, even for an approved seller | Allowed (the lock applies to the seller only, see 5.7) |
| SL-41 | Open the edit page of a Rejected seller | The Account status select offers only **Suspended**, with a hint saying why. Saving keeps Suspended |
| SL-42 | Open the edit page of a Pending seller | Only **Inactive** is offered |
| SL-43 | Open the edit page of an Unverified seller | Only **Inactive** and **Suspended** are offered |
| SL-44 | Open the edit page of a Verified seller | Active, Inactive and Suspended are all offered |
| SL-45 | Edit an address, name or documents of a **queued** seller | The seller **stays in the queue** (see 4.7) |

### 3.6 Profile change history

| ID | Steps | Expected |
|---|---|---|
| SL-46 | After SL-33 and SL-38, open the detail page and read **Profile change history** | One entry per save, newest first. Each shows who (admin or seller), when, and for every changed field a before and an after |
| SL-47 | Check a name change | Shows the old name and the new name |
| SL-48 | Check a city change | Shows names, not just numbers |
| SL-49 | Check a password change | Shows `[hidden]` on both sides. The password itself is never shown |
| SL-50 | Check a document change | Shows the document list before and after |
| SL-51 (edge) | Save the edit page without changing anything | No new entry |
| SL-52 | Make a change as the seller (5.5), then read the history as admin | Entry shows the seller as the author |
| SL-53 | Status or verification changes | **Not** in this card; they are in the Status change history (4.8) |

### 3.7 Access

| ID | Steps | Expected |
|---|---|---|
| SL-54 (edge) | Sign out and open `/admin/sellers` | Goes to the admin login |
| SL-55 (edge) | Log in as a seller, then open `/admin/sellers` | Cannot use the admin area |

### 3.8 Delete (no orders)

| ID | Steps | Expected |
|---|---|---|
| SL-56 | Press **Delete** on a seller with no orders. The confirm says it permanently deletes the seller and their uploaded documents. Confirm | Seller is gone |
| SL-57 | Delete and Cancel in the confirm | Nothing is deleted |
| SL-58 | Delete a seller that is in the queue | Gone from the list and from the queue; the menu badge goes down |

### 3.9 Delete when the seller has an order (edge)

Needs a seller who has an order (use a seller you were told has orders; the QA lead can name one).

| ID | Steps | Expected |
|---|---|---|
| SL-59 | Press **Delete**, confirm | Refused. A red bar shows the server's reason "This seller has one or more orders. Deactivate or suspend the account instead of deleting." with **Deactivate instead**, **Suspend instead** and **Dismiss** |
| SL-60 | **Dismiss** | Bar goes away. Seller unchanged |
| SL-61 | **Deactivate instead** | Seller becomes Inactive. List and menu badge refresh |
| SL-62 | **Suspend instead** | Seller becomes Suspended |
| SL-63 (edge) | Seller already Inactive | The **Deactivate instead** button is not shown |
| SL-64 (edge) | A Pending or Rejected seller (rules from section 4 apply) | If the server refuses the status change, its message shows in the bar |

---

## 4. Seller verification (admin side)

This is the core of the work. Read 4.1 and 4.2 first. They are the rules the screen follows.

### 4.1 The two statuses and what they allow

A seller has two separate statuses:

- **Verification:** Unverified, Pending, Verified, Rejected.
- **Account status:** Active, Inactive, Suspended.

The account status is **partly decided by the verification**. Not every pair can exist:

| Verification | Account status can be | Why |
|---|---|---|
| Unverified | Inactive or Suspended (never Active) | An Unverified seller cannot be Active |
| Pending | Inactive only | Pending forces Inactive |
| Verified | Active, Inactive or Suspended (free) | The admin chooses |
| Rejected | Suspended only | Rejected forces Suspended |

So there are **7 reachable pairs**. The server also changes the account status for you when you change the verification (see 4.4).

### 4.2 Access: what each pair lets a seller do

**Every account status can log in.** The status decides what the seller can do after login. The Review panel shows this as the **Access** badge.

| Verification | Account | Access badge | Seller can |
|---|---|---|---|
| Verified | Active | **Full access** | Everything |
| Verified | Inactive | **Locked** | Log in and look. Cannot change anything, not even the profile |
| Verified | Suspended | **Locked** | Same as above |
| Unverified | Inactive or Suspended | **Profile only** | Change own profile and documents only |
| Pending | Inactive | **Profile only** | Same |
| Rejected | Suspended | **Profile only** | Same, plus press **Resubmit**. (A rejected seller is a special case: still allowed to edit, so they can fix and resubmit) |

### 4.3 The movement rules

1. A **Rejected** seller can only move to **Pending**. Nothing else.
2. A seller who has **ever been Verified** can **never be Rejected**, from any status, forever. (Verified, then moved to Pending or Unverified, is still "ever verified".)
3. **Rejecting needs a note.**
4. Any other pair among Unverified, Pending and Verified is open in both directions.

### 4.4 What the account status becomes

When you change the verification, the account status follows:

| You set Verification to | Account status |
|---|---|
| Pending | becomes **Inactive** |
| Rejected | becomes **Suspended** |
| Unverified (while Active) | becomes **Inactive** |
| Verified | Unchanged unless you tick "Also set the account status to Active" |

### 4.5 The Review panel (buttons)

Open the detail page of a seller. The **Review** card shows:

- Badges: **Verification**, **Account status**, **Access**, and the current note (if any). A sentence under them says "Every account status can log in." and explains the access.
- **Verification** buttons: **Unverified**, **Pending**, **Verified**, **Rejected**.
- **Account status** buttons: **Active**, **Inactive**, **Suspended**.
- A "Rules:" line.
- **Status change history** table.

How buttons behave:

- The button of the **current** status is off (greyed). Hover shows "This is the current verification status." (or account status).
- A button the rules forbid is **off** with a hover reason, and the reason is also written under the buttons.
- A verification button opens a small form: "Set the verification to X", a note box, and a line telling what the account status will become.
- An account status button asks a browser confirm first.

Reason texts (must match):

- "A Rejected seller can only be moved to Pending next."
- "A seller who has ever been Verified can never be Rejected."
- "While the verification is Pending the account is Inactive."
- "While the verification is Rejected the account is Suspended."
- "An Unverified seller cannot be Active."

After a change the page shows a notice such as "QA-ES Rafiq: verification set to Verified and the account status to Active." or "QA-ES Rafiq: account status set to Inactive."

### 4.6 Case matrix: buttons by state

Use a fresh seller for each row. Reach the state with the steps in 0.2 and the Review panel. "On" means the button can be pressed.

| ID | State (Verification / Account) | Verification buttons On | Account buttons On | Reason text under the buttons |
|---|---|---|---|---|
| VR-1 | Unverified / Inactive | Pending, Verified, Rejected | Suspended | "An Unverified seller cannot be Active." |
| VR-2 | Unverified / Suspended | Pending, Verified, Rejected | Inactive | "An Unverified seller cannot be Active." |
| VR-3 | Pending / Inactive | Unverified, Verified, Rejected | none | "While the verification is Pending the account is Inactive." |
| VR-4 | Verified / Active | Unverified, Pending (Rejected **off** once ever verified) | Inactive, Suspended | "A seller who has ever been Verified can never be Rejected." |
| VR-5 | Verified / Inactive | Unverified, Pending | Active, Suspended | same ever-verified line |
| VR-6 | Verified / Suspended | Unverified, Pending | Active, Inactive | same ever-verified line |
| VR-7 | Rejected / Suspended | **Pending only** | none | "A Rejected seller can only be moved to Pending next." and "While the verification is Rejected the account is Suspended." |
| VR-8 (edge) | Was Verified, now Pending or Unverified | Rejected stays **off** | per 4.1 | "A seller who has ever been Verified can never be Rejected." |

### 4.7 The review actions

| ID | Steps | Expected |
|---|---|---|
| VA-1 | On an Unverified/Inactive seller press **Verified**. The form shows the ticked box "Also set the account status to Active, so the seller can use the full seller features". Leave it ticked, press **Set Verified** | Notice: verification set to Verified and the account status to Active. Badges: Verified, Active, Access **Full access**. History gets a new row |
| VA-2 | Same, but untick the box | Verified with account status unchanged (Inactive). Access badge **Locked**. This is the "approved but paused" state |
| VA-3 | On an Unverified seller press **Rejected**. Press **Set Rejected** with the note **empty** | "A note is required when rejecting." Nothing changes |
| VA-4 | Type a note, e.g. `NID photo is unreadable`, press **Set Rejected** | Verification Rejected, account Suspended, Access **Profile only**. The note shows in the badges row and in the history. A hint says a Rejected seller can still log in, fix things and Resubmit |
| VA-5 (edge) | Before pressing **Set Rejected**, read the line in the form | It says "The account status becomes Suspended." |
| VA-6 | On a Rejected seller, only **Pending** is on. Press **Pending** and set it | Pending, Inactive, Access **Profile only** |
| VA-7 | On a Pending seller press **Verified** with the box ticked | Verified and Active |
| VA-8 | On a Verified/Active seller press **Pending** | Form says "The account status becomes Inactive." After: Pending, Inactive |
| VA-9 | On a Verified/Active seller press **Unverified** | Form says "An Unverified seller cannot be Active, so the account status becomes Inactive." After: Unverified, Inactive |
| VA-10 | On a Verified/Inactive seller press **Unverified** | Unverified, Inactive. No side-effect line (already Inactive) |
| VA-11 (edge) | On a Verified/Suspended seller press **Pending** | Pending, Inactive |
| VA-12 | Press **Cancel** in the verification form | Form closes, nothing changes |
| VA-13 | Set a status with a note, then set another status **without** a note | The old note is gone from the badges row (a note belongs to its status only). History keeps both rows |
| VA-14 (edge) | Reject a seller who was **never** verified, then set Pending, then Verified, then try Rejected | After Verified the **Rejected** button is off with the ever-verified reason |
| VA-15 | Press the **Inactive** account button on a Verified/Active seller. Read the confirm | Says the seller can still log in but is fully locked and cannot change anything, not even the profile. Confirm: status Inactive, Access **Locked** |
| VA-16 | Press **Suspended** on a Verified/Inactive seller | Same confirm wording. After: Suspended, **Locked** |
| VA-17 | Press **Active** on a Verified/Locked seller | Active, **Full access** |
| VA-18 | Account button on an Unverified or Pending seller (the allowed one) | The confirm says they can still log in and change their profile, but cannot use seller features. After: **Profile only** |
| VA-19 (edge) | Press a button whose result equals the current one | The button is already off |
| VA-20 (edge) | Two admins act on the same seller at once (second admin acts after the first) | The second sees the server's message, or the new state after reload. No page error |

### 4.8 History

| ID | Steps | Expected |
|---|---|---|
| HS-1 | Read **Status change history** of a self-registered seller | Oldest row is the registration: "Unverified … (seller — sign-up)" |
| HS-2 | After VA-1 | New row on top with the status, note (or "—"), your name as "(admin)" |
| HS-3 | Press a status change that changes only the account status (VA-15) | **No** new history row (the history is about verification only) |
| HS-4 | After a seller Resubmits (5.9) | A row "(seller — resubmitted)" with the seller's message as the note. Earlier rejection rows stay |
| HS-5 | Admin-created seller | First row is "Verified" with "(admin)" |

### 4.9 The Seller Request queue

| ID | Steps | Expected |
|---|---|---|
| QU-1 | Open **Seller Requests** | Columns: Seller, Phone, Verification, Status, Requested. Title explains the queue |
| QU-2 | Check order | Newest request first. The sort control offers "Newest request", "Oldest request", "Name A to Z", "Name Z to A" |
| QU-3 | Change the sort | The list reorders and starts again from the top |
| QU-4 | With more than one page, press **Load more** | More rows are added without repeating any. At the end the button reads "No more requests". There is no total or page number |
| QU-5 | Search and the filters (verification, status, business profile and others) | Narrow the queue. The queue page has no Seller Request filter |
| QU-6 | Empty queue | "No requests are waiting. New sign-ups appear here." With a filter: "No requests match these filters." |
| QU-7 | Open a queued seller from the queue, set a status, then press **Back to the queue** in the notice | You return to the queue and the seller is gone from it |
| QU-8 | Which actions remove the seller from the queue | Setting any **real** new verification status (Pending, Verified, Rejected, Unverified) or account status. Changing nothing, or only editing the profile/address/documents, does **not** |
| QU-9 | An address edit on a queued seller (SL-45) | Seller **stays** in the queue |
| QU-10 | A seller you reject | Leaves the queue. The seller is **not** in the queue until they Resubmit |
| QU-11 | After the seller Resubmits (5.9) | They are back in the queue, as the **newest** request. The detail page shows "This seller was rejected, fixed their application and resubmitted it on <date>" |
| QU-12 (edge) | A seller an admin created | Never in the queue |

---

## 5. Seller side: what the seller sees

Use the seller login (phone and password). For each state, set it from the admin Review panel, then log in as the seller (log out first, or use a private window).

### 5.1 Sign-up

| ID | Steps | Expected |
|---|---|---|
| SS-1 | Open `/seller/register`, fill all fields, add an NID, submit | "Thanks, we've got your registration". The admin queue shows the seller |
| SS-2 (edge) | Phone or email already used | Server message shows |
| SS-3 (edge) | Weak password, wrong file type, oversize file | Refused with a message |
| SS-4 (edge) | A **rejected** seller registers again with the same phone or email | Refused. They must use Resubmit |
| SS-5 | Log in right after sign-up | Login works (200). The seller lands in the seller area. An information banner says "Your application is under review. You can edit your profile while you wait." |

### 5.2 Login per state

For every state in 4.1, the seller **can log in**. Check each:

| ID | State | Expected after login |
|---|---|---|
| SL-LG-1 | Unverified / Inactive | Banner "Your application is under review…". Profile editable |
| SL-LG-2 | Pending / Inactive | Same banner. Profile editable |
| SL-LG-3 | Rejected / Suspended | Red banner "Your application was rejected." with "Reason: <the note>" and a **Fix and resubmit** link. Profile editable. A **Resubmit your application** card is on the profile page |
| SL-LG-4 | Verified / Inactive | Banner "Your account is paused. You can look at your account, but you cannot change anything until an admin makes it active again." |
| SL-LG-5 | Verified / Suspended | Banner "Your account is suspended. …" same meaning |
| SL-LG-6 | Verified / Active | No banner. The seller dashboard opens |
| SL-LG-7 (edge) | Wrong password | Login refused with a message. Nothing else |
| SL-LG-8 (edge) | Old phone number after an admin changed it (SL-34) | Refused |

### 5.3 Profile page by tier

Open **My profile** (`/seller/profile`).

| ID | State | Expected |
|---|---|---|
| SP-1 | Full | Everything editable. **Save changes** works. Phone and email show "cannot be changed for now" |
| SP-2 | Profile only (Unverified, Pending) | Everything editable. **Save changes** works |
| SP-3 | Profile only (Rejected) | Editable, plus the **Resubmit your application** card |
| SP-4 | **Locked** (Verified/Inactive or Suspended) | A note says the profile is read-only. The details and documents are greyed out and **Save changes** is off. No Resubmit card |
| SP-5 (edge) | In the Locked state, try to type in a field | Not possible |
| SP-6 | Change nothing and press **Save changes** | "There is nothing to save: no field was changed." |
| SP-7 | Change a field and save | "Profile saved." The admin's Profile change history shows an entry by the seller |
| SP-8 | A Locked seller opens other seller pages (orders, listings, gigs, jobs) | They can look; actions are refused or hidden. Note what you see **(observe)** |
| SP-9 | Profile-only seller opens full-feature pages (listings, gigs, orders) | Refused or hidden; the seller is not allowed to use them yet |

### 5.4 Password change

| ID | Steps | Expected |
|---|---|---|
| PW-1 | In a Full or Profile-only state, open the seller **Password** page and change it | Works. Next login uses the new one |
| PW-2 | History as admin | Shows an entry with `[hidden]` |

### 5.5 Documents (before approval)

While the seller is **not** Verified (Unverified, Pending, Rejected):

| ID | Steps | Expected |
|---|---|---|
| DC-1 | Add a certificate, remove it, **Save documents** | "Documents saved." |
| DC-2 | Replace the NID (remove and add a new NID in one save) | Works |
| DC-3 (edge) | Remove the only NID without adding another (any state) | Refused: "At least one NID document is required. Upload the new NID in the same request." |
| DC-4 (edge) | A rejected seller removes the last NID | Same refusal. A rejected seller always keeps at least one NID |
| DC-5 | Add Birth Certificate | Allowed before approval |
| DC-6 (edge) | Wrong file type or oversize | Refused at once |

### 5.6 Documents (after approval)

| ID | Steps | Expected |
|---|---|---|
| DC-7 | After the seller is Verified/Active, open Documents | The hint says "Identity documents are locked after verification. Ask an admin to change them." |
| DC-8 | Look at the NID and Birth Certificate rows | Show **Locked**, no Remove |
| DC-9 | Look at Certificate and Other rows | Still removable, and new Certificate and Other documents can be added |
| DC-10 (edge) | Try to add a new NID or Birth Certificate | Not offered or refused |
| DC-11 | An admin changes the seller's NID on the Update page (SL-40) | Works. The lock does not apply to admins |
| DC-12 | Pause the seller (Inactive) | The lock **stays** (it follows verification, not the account switch). The Locked tier also blocks all edits |
| DC-13 | Move a Verified seller back to **Pending** (VA-8) | The lock follows verification: NID and Birth Certificate are editable again while not approved. Record exactly what you see **(observe)** |

### 5.7 Resubmit

Use a **Rejected** seller (VA-4).

| ID | Steps | Expected |
|---|---|---|
| RS-1 | Log in, press **Fix and resubmit** in the banner | The page scrolls to the Resubmit card |
| RS-2 | Fix a field and add or replace an NID, save | Saved |
| RS-3 | Type a message (up to 1000 characters) and press **Resubmit application**. The browser asks "Send your application to the reviewers again?". Confirm | The seller is now Pending. The banner changes to "Your application is under review…" and the Resubmit card goes away |
| RS-4 | Press it again with Cancel in the confirm | Nothing is sent |
| RS-5 | Resubmit with the message left empty | Works |
| RS-6 | As admin, check the seller | Pending, Inactive, in the queue, newest request. The history has a "(seller — resubmitted)" row with the message. The earlier rejection row and its note are still there |
| RS-7 | As admin, check the **Seller Requests** badge number | Up by one |
| RS-8 (edge) | A Verified seller, or an Unverified or Pending one, looks for Resubmit | The card is not shown (only Rejected sellers resubmit) |
| RS-9 (edge) | A Locked seller | No Resubmit card, nothing editable |

---

## 6. End-to-end walkthroughs

Do these in order with one fresh seller. They tie the sections together.

**Walkthrough A: approve**

1. Self-register `QA-ES Walk A` (SS-1).
2. Admin: the Seller Requests badge goes up by one. The seller is in the queue as Unverified/Inactive.
3. Seller logs in: "under review" banner, profile editable.
4. Admin: open the seller from the queue, check the documents link, press **Verified** with the box ticked.
5. Admin: seller left the queue, badge down by one. Review shows Verified, Active, Full access. History has two rows.
6. Seller logs in again: no banner, dashboard opens. The NID shows **Locked** on the profile page.

**Walkthrough B: reject and resubmit**

1. Self-register `QA-ES Walk B`.
2. Admin: press **Rejected** with no note: refused. Add a note `Bad NID scan`, set it. Verification Rejected, account Suspended, Access Profile only.
3. Seller logs in (this must work): red banner with the reason, **Fix and resubmit**.
4. Seller replaces the NID, saves, adds a message, presses **Resubmit application**.
5. Admin: seller is Pending/Inactive, in the queue as the newest request. History: sign-up, rejected (note kept), resubmitted (message).
6. Admin sets **Verified** (box ticked). Seller is Full access.
7. Admin tries **Rejected** now: the button is off ("A seller who has ever been Verified can never be Rejected.").

**Walkthrough C: pause and restore**

1. With the approved seller from A, admin presses **Inactive**. Read the confirm. Confirm.
2. Seller logs in: login works, "Your account is paused" banner, profile read-only. Access **Locked**.
3. Admin presses **Suspended**: same Locked result, banner says suspended.
4. Admin presses **Active**: Full access again. The seller is **not** put back in the queue at any point.

**Walkthrough D: delete rules**

1. Delete a seller with no orders: works.
2. Try a seller with an order: refused with **Deactivate instead** and **Suspend instead**. Press **Suspend instead**: seller becomes Suspended.

---

## 7. Known behaviour to report if it looks wrong

These are things the system does today. Report them if a build behaves differently, or if the team has decided to change them.

1. **Geography and category deletes are off** and some used rows cannot be deleted. Not part of this guide (see the Geography and Catalog guide).
2. **Delete confirm for sellers, buyers and admins** is a browser dialog, not an in-page one.
3. **Email and phone "verified" filters** return nothing until the OTP feature exists.
4. **Role and status changes for admins** are on the edit page, not in the list.
5. **Not covered by earlier automated checks:** the seller pressing Resubmit and reappearing at the top of the queue (RS-3, RS-6, QU-11), the seller's locked NID after approval (DC-7 to DC-13), and an admin editing a seller's documents on the Update page (SL-40, DC-11). Please run these by hand and report the result clearly.
6. Items marked **(observe)** record what happens today; they are not requirements.

---

## 8. Quick reference

**Login and access by state**

| Verification | Account | Can log in | Access |
|---|---|---|---|
| Unverified | Inactive / Suspended | Yes | Profile only |
| Pending | Inactive | Yes | Profile only |
| Verified | Active | Yes | Full |
| Verified | Inactive / Suspended | Yes | Locked |
| Rejected | Suspended | Yes | Profile only + Resubmit |

**What each admin button does**

| Button | Result |
|---|---|
| Verified (box ticked) | Verified + Active |
| Verified (box unticked) | Verified, account status unchanged |
| Pending | Pending + Inactive |
| Rejected (note required) | Rejected + Suspended |
| Unverified | Unverified; Active becomes Inactive |
| Active / Inactive / Suspended | Only the account status changes. No new history row |

**Leaves the queue:** a real change of verification or account status.
**Stays in the queue:** profile, address or document edits, the same status sent again, a note alone, a failed save.
**Returns to the queue:** the seller signs up, or Resubmits.
