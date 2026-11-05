# QA README: Admin Geography and Catalog

This guide lets a tester check every screen, rule, message and odd case of two admin areas:

- **Geography:** Country, State, City, Thana.
- **Catalog:** Categories (Product and Service), Measurements, Brands, Attributes and their Values.

You do not need to read any code. Every case says what to do and what you should see. Cases marked **(edge)** are the odd ones. Cases marked **(observe)** record what the system does today and may be reported as a defect, see section 9.

---

## 0. Before you start

### Accounts

| Who | Login | Use |
|---|---|---|
| Plain admin | `test.admin@egoola.com` / `Test@12345` | All cases in this guide |
| Super-admin | `test.super@egoola.com` / `Test@12345` | Only for the "who can open it" checks |
| Buyer | Register one on the buyer site | Only for the access checks and to read the public pages |

Admin login page: `http://localhost:3000/admin/login`.

### Test data rules

- Start every name you create with **`QA-`** and your initials, for example `QA-ES Dhaka`. This keeps your data apart from the shared data and makes clean-up easy.
- Do not edit or delete data that does not start with `QA-`.
- **Delete is switched off in some places** (see 0.3). Rows you cannot delete will stay. Keep the number small and re-use them.

### 0.1 Where things are

| Area | Address | How to reach it |
|---|---|---|
| Geography | `/admin/geography` | Left menu **Geography**. Tabs: Countries, States, Cities, Thanas. The open tab is kept in the address (`?tab=states`, `?tab=cities`, `?tab=thanas`) |
| Catalog | `/admin/catalog` | Left menu **Catalog**. Tabs: Categories, Measurements, Brands, Attributes. Under Categories, two more tabs: Product Categories and Service Categories |

### 0.2 Things that are the same on every list

- **Search box:** waits a moment after you stop typing, then filters. Clearing it shows everything again.
- **Paging:** "Page 1 of 3 — 52 total" with **Previous** and **Next**. The buttons are disabled at the ends. With no rows it says "0 results".
- **Empty list:** "No <things> found."
- **Loading:** "Loading…" while it fetches.
- **Add and Edit** open a dialog. **Cancel** or the X closes it without saving. A save error stays inside the dialog and keeps what you typed.
- **Messages come from the server** and are shown under the field they belong to, or in a red bar at the top of the dialog.
- **Sign-out in the middle:** if your session ends, the next action sends you to the admin login page.

### 0.3 What is switched on today

| Screen | Delete button |
|---|---|
| Geography (all four tabs) | **Hidden** (temporary switch `ALLOW_TAXONOMY_DELETE`) |
| Catalog, Categories (Product and Service) | **Hidden** (same switch) |
| Catalog, Measurements | Shown |
| Catalog, Brands | Shown |
| Catalog, Attributes and their Values | Shown |

Where Delete is hidden, skip the delete cases and mark them "Not applicable". When the switch is turned on later, run the cases in the sections marked **(when Delete is on)**.

### 0.4 File size rule (all pickers)

Images up to **2 MB**, videos up to **10 MB**, any other file up to **30 MB**. The limit is written beside the picker ("Image files only. Maximum size 2 MB."). A file over the limit is refused at once with "<name> is 2.5 MB. Images can be up to 2 MB." and the picker empties.

Files to prepare: a small PNG (about 300 KB), a PNG of about 1.9 MB, a PNG of about 2.5 MB, and a text file renamed to `.png`.

### 0.5 How to read the cases

`ID | Steps | Expected`. Mark each Pass or Fail. If something fails, note the exact text on screen, the time, and what you typed.

---

# Part A. Geography

Reference data used by address fields everywhere (buyer addresses, seller profile, job and listing locations). Four levels, in this order: **Country → State → City → Thana**. An admin creates every row by hand.

## 1. Rules (read first)

| Rule | Meaning |
|---|---|
| Parent chain | A State belongs to a Country, a City to a State (and its Country), a Thana to a City (and its State and Country). |
| Slug and Code | Created by the system from the name, shown read-only. You never type them. The code is a 3-digit number. |
| Rename | Changing a name changes the slug. The code stays. |
| Duplicate names | Checked **under the same parent**, ignoring upper or lower case and spaces around the name. The same name is fine under a different parent. |
| Parent must match | A City's state must belong to its country. A Thana's city must belong to its state, and its state to its country. |
| Name length | Up to 255 characters. |
| No detail page | Each row is shown only in the list. |
| Cascade | Deleting a parent also deletes everything below it (only when nothing uses it). **(when Delete is on)** |

## 2. Countries tab

Columns: Name, Code, Slug. Button: **+ Add Country**. Search: by name.

| ID | Steps | Expected |
|---|---|---|
| GC-01 | Open Geography | Countries tab is open. The address is `/admin/geography` |
| GC-02 | Press **+ Add Country**, leave Name empty, press **Create Country** | The browser asks you to fill the Name (it is required). Nothing is sent |
| GC-03 | Type only spaces and save | Refused. A message that the field is required or blank |
| GC-04 | Create `QA-ES Land` | The dialog closes. The row shows with a 3-digit Code and a Slug `qa-es-land` |
| GC-05 | Create `QA-ES Land` again | Dialog stays open: "A country with this name already exists." |
| GC-06 | Create `  qa-es land  ` (small letters, spaces around) | Same message. The check ignores case and outer spaces (edge) |
| GC-07 | Create `QA-ES  Land` (two spaces inside) | Note what happens. (observe) |
| GC-08 | Create a name of exactly 255 letters | Created. The row shows it without breaking the layout (edge) |
| GC-09 | Create a name of 256 letters | "Ensure this field has no more than 255 characters." (edge) |
| GC-10 | Create `QA-ES বাংলাদেশ 🌍` | Created and shown correctly. The slug leaves out the characters it cannot use (edge) |
| GC-11 | Create `<b>QA-ES</b>` | Created. The row shows the text `<b>QA-ES</b>` exactly, not bold (edge) |
| GC-12 | Create `!!!` | Created, but the Slug is **empty** (observe, see section 9) |
| GC-13 | Press **Edit** on `QA-ES Land`, rename to `QA-ES Land Two`, save | The row updates. The Slug is `qa-es-land-two`. The Code is unchanged |
| GC-14 | Edit and save without changing anything | Saves, nothing changes |
| GC-15 | Edit, rename to a name that another country has | "A country with this name already exists." |
| GC-16 | In the Edit dialog look at Slug, Code and Audit | Slug and Code are read-only. Audit shows "Created by … · Updated by …" |
| GC-17 | After GC-13, look at Audit | "Updated by" now shows your name |
| GC-18 | Search `qa-es` | Only matching rows |
| GC-19 | Search something that does not exist | "No countries found." |
| GC-20 | Search with capital letters | Still matches (not case sensitive) |
| GC-21 | Create more than one page of countries, use Next, Previous | Paging works. The count is right |
| GC-22 | Open the Edit dialog and press Cancel | Nothing changes |
| GC-23 | Press the X or click outside the dialog | It closes. Nothing is saved |
| GC-24 | **(when Delete is on)** Delete a country with no states | Confirm asks first. The row disappears |
| GC-25 | **(when Delete is on)** Delete a country with states and cities | The confirm says every state, city and thana under it is deleted too. After Delete, all of them are gone |

## 3. States tab

Open the **States** tab (the address becomes `?tab=states`). Columns: Name, Country, Code. Filter: **All countries**. Button: **+ Add State**. Create needs a Country.

| ID | Steps | Expected |
|---|---|---|
| GS-01 | Press **+ Add State** | A Country drop-down, a Name box. **Create State** is disabled until a country is chosen (check) |
| GS-02 | Create `QA-ES State A` under `QA-ES Land Two` | Row shows the state, its country and a Code |
| GS-03 | Create `QA-ES State A` again under the same country | "A state with this name already exists in this country." |
| GS-04 | Create `QA-ES State A` under a **different** country | Allowed (edge) |
| GS-05 | Edit the state and move it to another country | Saved. The Country column changes. If the new country already has that name: "already exists in this country" (edge) |
| GS-06 | Rename a state | Slug changes. Code stays |
| GS-07 | Filter by a country | Only that country's states |
| GS-08 | Filter, then also type a search | Both narrow the list |
| GS-09 | Pick a country filter with no states | "No states found." |
| GS-10 | Switch tabs and back | The list loads again. The filter is reset |
| GS-11 | Reload while on States | You stay on the States tab (the address keeps `?tab=states`) |
| GS-12 | Open `/admin/geography?tab=nonsense` | The Countries tab opens |
| GS-13 | **(when Delete is on)** Delete a state with cities | The confirm warns about cities and thanas |

## 4. Cities tab

Columns: Name, State, Country, Code. Filters: **All countries**, **All states** (the state filter is disabled until a country is chosen). Create needs Country and State.

| ID | Steps | Expected |
|---|---|---|
| GCT-01 | Press **+ Add City** | Country drop-down, then State drop-down (empty and disabled until a country is chosen) |
| GCT-02 | Choose a country | The State list fills with that country's states only |
| GCT-03 | Change the country after choosing a state | The State choice is cleared (edge) |
| GCT-04 | Create `QA-ES City A` | Row shows state and country |
| GCT-05 | Same city name in the same state | "A city with this name already exists in this state." |
| GCT-06 | Same city name in another state | Allowed |
| GCT-07 | Pick a country that has no states | The State list is empty, and Create stays disabled |
| GCT-08 | Move a city to another state in the same country | Saved |
| GCT-09 | Move a city to a state of another country (change the country first) | Saved. The Country column changes |
| GCT-10 | Country filter, then State filter | Narrow the list. Changing the country clears the state filter |
| GCT-11 | While a state is chosen, change the country filter to another | The state filter resets |
| GCT-12 | **Mismatch (edge):** with two browser tabs, in tab 1 open Add City and choose a state. In tab 2 move that state to another country. In tab 1 press Create | The server refuses: "This state does not belong to the selected country." It shows inside the dialog (under the form), and nothing is saved |
| GCT-13 | **(when Delete is on)** Delete a city with thanas | The confirm warns about thanas |

## 5. Thanas tab

Columns: Name, City, State, Country, Code. Filters: All countries, All states, All cities (each disabled until the one before it is chosen). Create needs Country, State and City.

| ID | Steps | Expected |
|---|---|---|
| GT-01 | Press **+ Add Thana** | Three drop-downs that fill one after another |
| GT-02 | Create `QA-ES Thana A` under a city | Row shows city, state, country |
| GT-03 | Same thana name in the same city | "A thana with this name already exists in this city." |
| GT-04 | Same name in another city | Allowed |
| GT-05 | Choose a city that has no thanas, then open the Thana filter | Empty result with "No thanas found." |
| GT-06 | Change country, state or city in the form | The levels below clear |
| GT-07 | Move a thana to another city | Saved. All three parent columns update |
| GT-08 | **Mismatch (edge):** same two-tab idea as GCT-12, but for a Thana | The message "This state does not belong to the selected country." (or the city one) shows inside the dialog |
| GT-09 | The three filters | Each narrows the list. Resetting a higher filter resets the lower ones |
| GT-10 | Tab order and labels | Each filter drop-down has a name for screen readers: "Filter by country", "Filter by state", "Filter by city" |
| GT-11 | Add a thana, then check it on the buyer address form | After you pick the country, state and city, the thana appears in the buyer Add address list |

## 6. Geography cross-checks

| ID | Steps | Expected |
|---|---|---|
| GX-01 | Create a full chain (country, state, city, thana) and open the buyer site **Add address** | You can pick the whole chain, and a saved address shows the place names |
| GX-02 | A city with **no** thana | In the buyer address form a note says the city has no thanas. The buyer cannot save (the thana is required) (observe) |
| GX-03 | Rename a country that has addresses | Existing addresses show the new name |
| GX-04 | **(when Delete is on)** Delete a country that a buyer address uses | The server refuses with an error. The screen says the place is probably still used and nothing was changed (observe: the server answers a 500 today, see section 9) |
| GX-05 | Slow connection: throttle the network in the browser | Drop-downs show their empty text until loaded. Nothing breaks. Create stays disabled until choices exist |
| GX-06 | Narrow the window to phone width | Tables scroll sideways inside their box. The dialog fits the screen |

---

# Part B. Catalog

The things listings are built from: **Categories**, **Measurements**, **Brands**, **Attributes** (with **Values**).

## 7. Categories

Open **Catalog → Categories**. There are two sub-tabs: **Product Categories** and **Service Categories**. Each shows only its own type. Columns: **Image, Name, Immediate Parent, Parent Chain, Sort order, Status**. Search by name and a status filter (All statuses, Active, Inactive). Button: **+ Add Category**.

### 7.1 Rules

| Rule | Meaning |
|---|---|
| One tree per type | A category and its parent must be the same type (product or service). The type is set by the tab you create it in |
| Name | Unique within the same type. The same name may exist once as a product and once as a service. Up to 255 characters |
| Slug | Made by the system from the name, shown read-only. Renaming changes it |
| Parent | Optional. "No parent (top-level)" makes a top-level category. A category can never be its own parent or sit under its own descendant |
| Sort order | A whole number. Default 0. Lists order by sort order, then name. Negative numbers are accepted. The largest value is 2,147,483,647 |
| Status | Active or Inactive. An inactive category cannot be chosen for a new listing |
| Image | Optional. Images only, up to 2 MB. A new image replaces the old one. An image cannot be removed once set |
| No detail page | The list row has everything |

### 7.2 List and filters

| ID | Steps | Expected |
|---|---|---|
| CA-01 | Open Product Categories | Only product categories. The header reads Image, Name, Immediate Parent, Parent Chain, Sort order, Status |
| CA-02 | Open Service Categories | Only service categories |
| CA-03 | A category that has an image | A small picture in the Image column. The Name stays in its own column |
| CA-04 | A category with no image | An empty space the same size. Rows keep the same height |
| CA-05 | A top-level category | Immediate Parent and Parent Chain show "—" |
| CA-06 | A category two levels down (A › B › C) | Immediate Parent shows B. Parent Chain shows "A › B" |
| CA-07 | Search a name | Only matches in this type. Search in the other tab does not show these |
| CA-08 | Status filter Inactive | Only inactive ones, with a grey "inactive" badge |
| CA-09 | Search and status filter together | Both apply |
| CA-10 | More categories than one page | Paging works. The parent names still fill in on page 2 |
| CA-11 | Switch from Product to Service and back | Each tab reloads. The search box is reset |

### 7.3 Create

| ID | Steps | Expected |
|---|---|---|
| CA-20 | **+ Add Category**, empty Name, save | Required message from the browser |
| CA-21 | Create `QA-ES Electronics` with no parent, sort order 0, Active, no image | Row appears. Slug shown on edit |
| CA-22 | Create the same name in the same tab | "A category with this name already exists for this type." |
| CA-23 | Create the same name in the **other** tab | Allowed (edge) |
| CA-24 | Create `QA-ES Mobiles` and choose parent `QA-ES Electronics` in the tree | Row shows Immediate Parent `QA-ES Electronics` |
| CA-25 | In the parent picker type part of a name | The tree narrows to the match, with its parents and its children kept |
| CA-26 | Expand and collapse a branch with the arrows | Works. A chosen parent shows below the tree as "Selected: …" |
| CA-27 | Choose "No parent (top-level)" after picking a parent | Selected line returns to No parent |
| CA-28 | Clear the Sort order box and save | Saved as 0 |
| CA-29 | Sort order `abc` | The number box accepts only numbers; if forced, the server says "A valid integer is required." |
| CA-30 | Sort order `-5` | Accepted. The category sorts before 0 (edge) |
| CA-31 | Sort order `2147483647` and `2147483648` | The first is saved. The second: "Ensure this value is less than or equal to 2147483647." (edge) |
| CA-32 | Sort order with a decimal `1.5` | Refused with a message |
| CA-33 | Status Inactive on create | Saved as inactive. It shows a grey badge. It appears in the tree marked "(inactive)" |
| CA-34 | Name of 255 letters, then 256 letters | 255 saved, 256 refused with the 255-character message (edge) |
| CA-35 | Name with unicode (বাংলা, emoji) and with `<b>` | Saved and shown as plain text (edge) |
| CA-36 | Name with only spaces | Refused |

### 7.4 Image

| ID | Steps | Expected |
|---|---|---|
| CA-40 | Open Add Category | The image box says "No image". The line "Image files only. Maximum size 2 MB." shows |
| CA-41 | Choose a small PNG | Preview shows at once |
| CA-42 | Choose a 2.5 MB PNG | Refused at once: "<name> is 2.4 MB. Images can be up to 2 MB." The picker empties and any earlier choice stays (edge) |
| CA-43 | Choose a 1.9 MB PNG | Accepted |
| CA-44 | Choose a text file renamed to `.png` | The server refuses with an image message under the box, and nothing is saved (edge) |
| CA-45 | Choose a PDF (change the file filter to All files) | Refused |
| CA-46 | Save with an image | The list shows the thumbnail |
| CA-47 | Edit and look at the image box | Shows the current image. No remove button (observe: an image cannot be removed) |
| CA-48 | Edit, choose another image, save | The thumbnail changes |
| CA-49 | Edit, save without choosing a file | The image stays |

### 7.5 Edit

| ID | Steps | Expected |
|---|---|---|
| CA-60 | Rename a category | The Slug changes. Children still show the new name in their chain |
| CA-61 | Save without a change | Saves, nothing changes |
| CA-62 | Move a category to another parent | Immediate Parent and Parent Chain update. Its children move with it |
| CA-63 | Make a child top-level (choose "No parent") | It becomes a root |
| CA-64 | Open the parent picker while editing `A` | `A` and its own descendants are **not** offered (so a loop cannot be made) (edge) |
| CA-65 | Force a loop with two browser tabs: tab 1 opens edit of `A` and keeps the page. Tab 2 moves `B` (a child of A) to be the parent of A and saves. In tab 1 choose `B` as the parent of `A` and save | The server refuses: "This parent would create a circular category chain." (edge) |
| CA-66 | Change the type of a category | Not possible. The type follows the tab and is not editable (check there is no type field) |
| CA-67 | Rename to a name another category of the same type has | "already exists for this type." |
| CA-68 | Set Inactive | Badge turns grey. It is marked "(inactive)" in the tree. Existing listings are not touched |
| CA-69 | Set Active again | Badge green |
| CA-70 | Edit the slug | The slug is read-only |

### 7.6 Delete **(when Delete is on)**

| ID | Steps | Expected |
|---|---|---|
| CA-80 | Delete a category used by no listing and without children | Confirm, then it is gone |
| CA-81 | Delete a category used by a listing (or whose child is) | The server refuses (409). A banner shows the server's reason and **Deactivate instead** and **Dismiss** buttons |
| CA-82 | Press **Deactivate instead** | The category becomes Inactive |
| CA-83 | Delete a category that has children and no listing | The confirm says sub-categories are deleted too. The whole branch is removed (observe, see section 9) |

### 7.7 Where categories show up

| ID | Steps | Expected |
|---|---|---|
| CX-01 | Open the buyer site Categories page | Active categories show as a tree with their images. An inactive one does not show |
| CX-02 | Open the seller **New listing** form | Only active categories of the right type can be chosen |
| CX-03 | Deactivate a category that a listing uses, then edit the listing | The category is kept on the listing but cannot be chosen for a new one |
| CX-04 | A category with 200 or more children | The tree and the list stay usable |

## 8. Measurements

Open **Catalog → Measurements**. Units such as Kilogram / kg, Litre / L used by product listings. Columns: Name, Symbol, Slug. Search matches the **name** only. Button: **+ Add Measurement**. Delete is shown.

### 8.1 Rules

| Rule | Meaning |
|---|---|
| Name | Required, up to 100 characters, **unique** across all measurements (case and outer spaces ignored) |
| Symbol | Required, up to 20 characters. The same symbol **can** be used by two measurements |
| Slug | Made from the name |
| No detail page | Not available |

### 8.2 Cases

| ID | Steps | Expected |
|---|---|---|
| ME-01 | Open the tab | A list with Name, Symbol, Slug |
| ME-02 | Add with Name and Symbol empty | Browser asks for both |
| ME-03 | Create `QA-ES Kilogram` with symbol `qkg` | Row appears with a Slug |
| ME-04 | Same name again | "A measurement with this name already exists." |
| ME-05 | Same name in other case with spaces around | Same message (edge) |
| ME-06 | A different name with the same symbol `qkg` | Created. Two rows share the symbol (observe) |
| ME-07 | Symbol only spaces | "This field may not be blank." |
| ME-08 | Name of 100 and then 101 letters | 100 saved. 101: "Ensure this field has no more than 100 characters." (edge) |
| ME-09 | Symbol of 20 and then 21 characters | 20 saved. 21 refused (edge) |
| ME-10 | Edit the symbol only | Saves. The slug stays |
| ME-11 | Edit the name | The slug changes |
| ME-12 | Search by name | Finds it |
| ME-13 | Search by symbol (`qkg`) | Finds nothing (observe: only the name is searched) |
| ME-14 | Delete an unused measurement | Browser confirm, then it is gone |
| ME-15 | Press Cancel on the confirm | Nothing is deleted |
| ME-16 | Create a product listing that uses the measurement, then delete the measurement | The delete **succeeds** (observe). Open the listing: its measurement is now empty |
| ME-17 | Failure of a delete (stop the backend, press Delete) | An alert says it could not be deleted. The row stays |
| ME-18 | The listing form's unit drop-down | Shows every measurement, even when there are more than one page of them (edge) |

## 9. Brands

Open **Catalog → Brands**. Columns: **Image, Name, Slug, Status, Created by**. Filter: All brands, Active, Inactive. Search by name. Button: **+ Add Brand**. Delete is shown.

### 9.1 Rules

| Rule | Meaning |
|---|---|
| Name | Required, unique across all brands (any case), up to 255 characters |
| Slug | Made from the name |
| Active | Default on. An inactive brand cannot be picked for a new listing |
| Logo | Optional image, up to 2 MB. A new one replaces the old. It cannot be removed once set |
| Delete | Refused while a listing (even a removed one) uses the brand. Deactivate instead |
| Created by | The admin who made it, with their type |

### 9.2 Cases

| ID | Steps | Expected |
|---|---|---|
| BR-01 | Open the tab | Header: Image, Name, Slug, Status, Created by |
| BR-02 | Press **+ Add Brand** | A logo box ("No logo"), the line "Image files only. Maximum size 2 MB.", Name, an **Active** tick (on) |
| BR-03 | Create `QA-ES Samsung` without a logo | Row shows an empty Image cell, status active |
| BR-04 | Create it again | "A brand with this name already exists." |
| BR-05 | Create `qa-es samsung` | Same message (any case) (edge) |
| BR-06 | Create with a small PNG logo | The thumbnail shows in the Image column |
| BR-07 | Choose a 2.5 MB logo | Refused at once with the size and the limit |
| BR-08 | Choose a non-image file | Refused (by the browser filter or the server message) |
| BR-09 | Edit a brand with a logo | The box shows the current logo and the button says **Replace logo** |
| BR-10 | Replace the logo | The thumbnail changes |
| BR-11 | Rename without choosing a file | The logo stays. The Slug changes |
| BR-12 | Untick Active and save | Badge "inactive". The **Active** filter no longer shows it |
| BR-13 | Filter Inactive | Only inactive brands |
| BR-14 | Name of 255 and 256 letters | 255 saved, 256 refused (edge) |
| BR-15 | Unicode name | Saved and shown correctly (edge) |
| BR-16 | The "Created by" column | Shows `Test Admin (admin)` for rows you made |
| BR-17 | Delete an unused brand | Confirm, then gone |
| BR-18 | Delete a brand a listing uses | A banner with the server's reason and **Deactivate instead** and **Dismiss** |
| BR-19 | Press **Deactivate instead** | The brand becomes inactive |
| BR-20 | Press **Dismiss** | The banner closes, nothing changes |
| BR-21 | The seller **New listing** form, Brand drop-down | Only active brands, with no pictures |
| BR-22 | A listing of type "brand" | A brand must be chosen |
| BR-23 | Edit a listing that uses a brand you then deactivated | The listing keeps the brand. A new listing cannot pick it |

## 10. Attributes and Attribute Values

Open **Catalog → Attributes**. An **Attribute** is a kind of option (Size, Colour). Its **Values** are the choices (S, M, L). Listings build their SKUs from these. Columns: **Attribute, Values, Status**. Search matches the English **or** Bangla name. Filter: All, Active, Inactive. Button: **+ Add Attribute**.

### 10.1 Rules

| Rule | Meaning |
|---|---|
| Attribute name | Required, unique (any case), up to 255 characters |
| Bangla name, descriptions | Optional |
| Active | An inactive attribute cannot get new values and cannot be picked for new SKU options |
| Value name | Required. Unique **within its attribute** (any case). The same name is fine under another attribute (`M` as a size and as a colour code) |
| Value belongs to one attribute | It can never be moved to another |
| Active (value) | An inactive value cannot be chosen for new SKU options. SKUs that already use it are not touched |
| Delete attribute | Also deletes its values. Refused while a listing SKU uses the attribute or any of its values |
| Delete value | Refused while a listing SKU uses it |

### 10.2 Attribute cases

| ID | Steps | Expected |
|---|---|---|
| AT-01 | Open the tab | Each row shows the attribute, its values on one line (inactive values crossed out), and its status |
| AT-02 | **+ Add Attribute**, empty name | Browser asks for the name |
| AT-03 | Create `QA-ES Size` with a Bangla name | The dialog **stays open** in edit mode, with a **Values of QA-ES Size** section below |
| AT-04 | Create `qa-es size` | "An attribute with this name already exists." (any case) |
| AT-05 | Name of 255 and 256 letters | 255 saved. 256 refused (edge) |
| AT-06 | Leave Bangla name and descriptions empty | Saved (empty is allowed) |
| AT-07 | Search the English name | Found |
| AT-08 | Search the Bangla name | Found |
| AT-09 | Status filter Inactive | Only inactive attributes |
| AT-10 | Edit the name | Saves. The values are untouched |
| AT-11 | Untick Active and save | Status inactive. In the values section **+ Add value** is disabled with the hint "Activate the attribute to add values" |
| AT-12 | Tick Active again | **+ Add value** is enabled |
| AT-13 | Delete an attribute with values and no SKU use | The confirm says "and all its values". After Delete, both are gone |
| AT-14 | Delete an attribute a listing SKU uses | A banner with the reason and **Deactivate instead** |
| AT-15 | **Deactivate instead** | The attribute becomes inactive |
| AT-16 | Cancel the confirm | Nothing is deleted |

### 10.3 Value cases (in the attribute's dialog)

| ID | Steps | Expected |
|---|---|---|
| AV-01 | Press **+ Add value** | A small form: Value name (`e.g. XL`), Bangla name, Description, Description in Bangla, Active tick |
| AV-02 | Add `S`, `M`, `L` | Each shows in the table with Bangla "—" and status Active |
| AV-03 | Add `s` (small letter) | "This attribute already has a value with this name." (edge) |
| AV-04 | Add `M` under a second attribute | Allowed (edge) |
| AV-05 | Edit a value name | Saves |
| AV-06 | **Deactivate** a value | Status Inactive. In the attribute list the value is crossed out |
| AV-07 | **Activate** it again | Active |
| AV-08 | Delete an unused value | Browser confirm, then gone |
| AV-09 | Delete a value a listing SKU uses | A banner with the reason and **Deactivate instead** |
| AV-10 | An attribute with more than 100 values (make 105) | The dialog lists **all** 105 (it loads every page). The row in the list shows all 105 too (edge) |
| AV-11 | Delete the 105th value | Works. The count is now 104 |
| AV-12 | An inactive attribute with values | The values show. They can be edited and deleted. New ones cannot be added |
| AV-13 | Press Cancel in the value form | The form closes, nothing is saved |
| AV-14 | Value name of 255 letters and 256 | 255 saved, 256 refused |
| AV-15 | Add a value while the attribute dialog is still open and check the list behind | After closing, the list row shows the new value |
| AV-16 | A value cannot change its attribute | There is no way to move it (check there is no such field) |

### 10.4 Where attributes show up

| ID | Steps | Expected |
|---|---|---|
| AX-01 | Seller **New listing**, SKU options | Only active attributes, each with only its active values |
| AX-02 | Deactivate a value that a listing already uses, then open that listing | The SKU keeps showing the value. A new SKU cannot pick it |
| AX-03 | Build a listing SKU with Size = S and Colour = Red | It saves. Then try deleting Size or S in the admin (AT-14, AV-09) |

---

# Part C. Shared checks

## 11. Who can open it

| ID | Steps | Expected |
|---|---|---|
| SC-01 | Signed out, open `/admin/geography` and `/admin/catalog` | Goes to the admin login page |
| SC-02 | Sign in, then open them | They open. Menu entries "Geography" and "Catalog" are highlighted |
| SC-03 | Buyer or seller signed in on their own site, open these addresses | They have no admin sign-in, so they go to the admin login page |
| SC-04 | Call the API with a buyer token (`GET /api/v1/geography/countries/`) | 403 |
| SC-05 | Call it with no token | 401 |
| SC-06 | Sign out in a second tab, then press Save in the first | You are sent to the admin login page. Nothing is saved |

## 12. Layout and usability

| ID | Steps | Expected |
|---|---|---|
| UX-01 | Use only the keyboard in a dialog | Tab moves through the fields. Enter submits. The close button can be reached |
| UX-02 | Browser zoom 200% | Nothing is cut off. Tables scroll inside their box |
| UX-03 | Phone width | Same as GX-06 |
| UX-04 | Press Create twice quickly | Only one record is made. The button shows "Saving…" |
| UX-05 | Reload while a dialog is open | The dialog closes. Nothing is saved |
| UX-06 | Back and forward buttons between tabs | The Geography tab follows the address. Catalog tabs stay on screen |
| UX-07 | A very long name | The row does not break the table. The name may wrap |
| UX-08 | Stop the backend and open a list | A red message "…couldn't load…" (no crash). Start it again and reload to recover |

---

## 13. Things that look odd today (observe)

These are what the system does now. Record them. Some are likely defects for the backend.

| # | What happens | Who owns it |
|---|---|---|
| 1 | **Deleting a place that is used** (a country, state, city or thana an address, order or listing uses) makes the server answer with an error page (500) instead of a clear message. Nothing is lost. The screen says it is probably still in use. Delete is hidden on Geography for now because of this | Backend |
| 2 | A geography name made only of symbols (`!!!`) is accepted and gets an **empty slug** | Backend |
| 3 | Deleting a **category with sub-categories** that no listing uses deletes the whole branch with no refusal | Backend (the brief says 409). Delete is hidden on Categories for now |
| 4 | Deleting a **measurement** that a listing uses succeeds and clears the listing's measurement | Backend (brands and attributes refuse with 409 in the same case) |
| 5 | Two measurements can have the same symbol. Search matches only the name | Backend / product decision |
| 6 | A category, brand or logo image **cannot be removed** once set, only replaced | Backend (clearing is refused with "may not be null") |
| 7 | A city with no thanas blocks saving a buyer address (the thana is required) | Product decision |
| 8 | A throw-away name with HTML such as `<b>x</b>` is saved as typed (shown safely as text) | Fine, note only |
| 9 | Delete on Measurements, Brands and Attributes uses a browser confirm box | Frontend style |

## 14. Clean-up

- Delete your `QA-` rows where Delete is shown (Measurements, Brands, Attributes and Values). Delete values first, then the attribute, or delete the attribute (which removes its values).
- Geography and Categories cannot be deleted for now. Leave them, or deactivate your `QA-` categories (Edit → Inactive).
- Do not delete the shared reference data.
