# QA README: Admin Products, Gigs, Jobs and Bidding

This guide lets a tester check every screen, rule, message and odd case of four admin areas:

- **Products** (a product listing: general, used, village, retail, wholesale or brand). It has a list, a Requested Products queue, create, detail, update, moderation, files and delete.
- **Gigs** (a seller's service offer, priced by packages). It has the same set of screens as Products.
- **Jobs** (a buyer's request for work). It has a list, create, detail, update and status moves. A job is never moderated.
- **Bidding** (sellers' offers on jobs). It has a list, create, detail, update, Accept, Reject and Cancel.

You do not need to read any code. Every case says what to do and what you should see. Cases marked **(edge)** are the odd ones. Cases marked **(observe)** record what the system does today. They are not defects unless the note says so.

---

## 0. Before you start

### Accounts

| Who | Login | Use |
|---|---|---|
| Plain admin | `test.admin@egoola.com` / `Test@12345` | Every case in this guide |
| Super-admin | `test.super@egoola.com` / `Test@12345` | Optional: confirm it sees the same menu |
| Test seller | Create one (see `04-admin-buyer-seller-management.md`, section 0.2), or use an approved seller from the Seller List | Owner of products and gigs, bidder on jobs |
| Test buyer | Create one under **Buyers** | Owner of jobs |

Admin login page: `http://localhost:3000/admin/login`.

### Test data rules

- Start every title you create with **`QA-`** and your initials, for example `QA-ES Red T-shirt`.
- Do not edit or delete data that does not start with `QA-`.
- You need at least: two approved sellers, one buyer, two active product categories (one with a child), two active service categories, one active brand, and (for options) at least one active attribute with two active values, for example Size with S and M. Create them under **Catalog** if they are missing.
- Test files: a JPG of about 500 KB, a PNG of about 2.5 MB (too big), a short MP4 under 10 MB, a PDF under 30 MB.
- A product or gig can be deleted (soft delete). A job and a bid can never be deleted, only cancelled.

### 0.1 Where things are

The left menu has a **Listing** group. Open it to see:

| Menu entry | Address | What it is |
|---|---|---|
| Product, then List | `/admin/catalog/listings` | All products |
| Product, then Requested Products | `/admin/catalog/listings/requests` | Products waiting for a decision. A number badge shows how many |
| Gig, then Gigs List | `/admin/gigs` | All gigs |
| Gig, then Requested Gigs | `/admin/gigs/requests` | Gigs waiting for a decision. A number badge shows how many |
| Job, then Jobs List | `/admin/jobs` | All jobs |
| Job, then Bidding | `/admin/bidding` | All bids |

More addresses: product detail `/admin/catalog/listings/{id}`, product update `/admin/catalog/listings/{id}/edit`, new product `/admin/catalog/listings/new`, gig detail `/admin/gigs/{id}`, gig update `/admin/gigs/{id}/edit`, new gig `/admin/gigs/new`, job detail `/admin/jobs/{id}`, job update `/admin/jobs/{id}/edit`, new job `/admin/jobs/new`, bid detail `/admin/bidding/{id}`, bid update `/admin/bidding/{id}/edit`, new bid `/admin/bidding/new`.

While you are on any page of a group, the group stays open and the matching entry is highlighted. A parent entry must not light up while its sibling is open (for example "Gigs List" must not light up on the Requested Gigs page).

### 0.2 How the three kinds differ (read this once)

| | Product | Gig | Job |
|---|---|---|---|
| Who it belongs to | A seller, or nobody (an admin listing) | A seller, or nobody (an admin gig) | A buyer (always) |
| What it sells | Items: price and stock live on SKUs, optionally with options like Size and Colour | Services: one **package** per price type (hourly, daily, weekly, monthly, fixed) | A request for work with a **budget** (one row per price type) |
| Moderation | Yes. Pending, Approved, Rejected, Changes requested, Draft | Yes. Same statuses | **No.** A job is live the moment it is posted |
| Status when an admin creates it | Approved (unless you choose another) | Approved (unless you choose another) | Open for bidding (cannot be chosen) |
| Stock | Yes | No | No |
| Quantity prices (price tiers) | Yes | No | No |
| Delete | Yes (asks first) | Yes (asks first) | No. Cancel instead |
| Paging in the list | Page numbers | Page numbers | Page numbers (Jobs), "Load more" (Bidding) |

A product id opened on a gig page, a gig id opened on a product page, and a product or gig id opened on a job page all show a "not found" message. The pages must not crash.

### 0.3 Rules that apply to every form

- **Update sends only what changed.** If you press Save without changing anything, nothing is sent (Job and Bid forms say "Nothing has changed.").
- **SKUs, packages, tiers and bids' price options are never deleted.** A saved one can only be changed, and (SKUs and packages) hidden. A new, unsaved row can be removed.
- **Server messages show beside the field they belong to.** An error with no field shows in a red banner at the top. Nothing is swallowed.
- **Files:** images up to 2 MB, videos up to 10 MB, PDFs up to 30 MB. A file over the limit is refused the moment you pick it, with its size and the limit.
- **Bangla fields** (title, description and so on) are optional twins of the English text.
- **Dates** use the browser's date-time pickers. A discount needs a discounted price before its dates can be set.

---

## 1. Products

### 1.1 Product list (`/admin/catalog/listings`)

| # | What to do | Expected |
|---|---|---|
| 1.1.1 | Open the list | Columns: picture, Title, Category, Brand, Price, Status, Requested. Each row has **View Details** and **Delete**. A row shows a "From" price, which is the cheapest active SKU. A product with no active SKU shows no price |
| 1.1.2 | Type in the search box | Placeholder says "Search title, Bangla title, brand, model or SKU code". Results narrow after a short pause. Paging resets to page 1 |
| 1.1.3 | Filter by status (All, Draft, Pending, Approved, Rejected, Changes requested) | Only that status shows |
| 1.1.4 | Filter by listing type (General, Used, Village, Retail, Wholesale, Brand) | Only that type shows |
| 1.1.5 | Filter by category | Only products filed **directly** in that category show. The server does an exact match, with no roll-up of sub-categories. The dropdown lists every category on purpose, so an admin can filter by any of them |
| 1.1.6 | Filter by brand | Only that brand shows |
| 1.1.7 | Open **Date filters**: set Created from and to, Requested from and to | Only products in the range show. The to date is included |
| 1.1.8 | Combine several filters, then clear them one by one | The list widens each time. "No listings" style empty message shows when nothing matches |
| 1.1.9 | Page through the list | "Page N of M, X total". Previous and Next are disabled at the ends |
| 1.1.10 (edge) | Search for something that exists, go to page 2 of the full list, then search again | The page returns to 1 |
| 1.1.11 | Look at a gig and a job | They never appear in the product list |

### 1.2 Create a product (`+ Add Listing`)

The form has these sections: Basics, Brand and details, Pricing and stock (SKUs), Price tiers, Product details, Location, Thumbnail and gallery, Initial status.

| # | What to do | Expected |
|---|---|---|
| 1.2.1 | Press **Save** with nothing filled | Browser stops you on the first required field (title, description). No request is sent |
| 1.2.2 | Fill title and description, leave the category empty, save | Banner: "Pick a category for this listing." |
| 1.2.3 | Pick a category, choose an owner type that needs a seller but pick no seller | Banner: `Pick a seller, or choose "No owner".` |
| 1.2.4 | Choose **No owner**, "One price", price 500, stock empty, save | Product is created. You land on its detail page. Status is **Approved**. Owner shows as no owner. Stock shows "not tracked" |
| 1.2.5 | Use the Bangla title and description | They show on the detail page |
| 1.2.6 (edge) | Create a second product with the same title for the **same seller** | Title error: "This seller already has a listing with this title. Update that listing instead." with a link "Open the existing listing (#N)" that opens it. The same title for a different seller, or with no owner, is allowed |
| 1.2.7 | Choose listing type **Brand** without a brand | The Brand box is marked "required for brand listings". The browser stops you |
| 1.2.8 | Choose listing type **Wholesale** or **Used** | The form accepts it. Used shows the Condition note boxes |
| 1.2.9 | Pick a brand, then fill Model, Origin (and Bangla), Warranty (and Bangla) | All show on the detail page |
| 1.2.10 | Fill Minimum order quantity (1 or more) and a Measurement unit | Both show on the detail page. A value of 0 or a decimal is refused by the browser or the server |
| 1.2.11 | Add specifications: Name "RAM", Value "6GB", add a second row, remove a row | Rows add and remove. Saved specs show on the detail page |
| 1.2.12 | Fill the location with country, state, city and thana | Each list narrows to the parent you chose. They show on the detail page |
| 1.2.13 | Stage a thumbnail and two gallery files before the first save | After save the files upload. They show on the detail page |
| 1.2.14 (edge) | Stage files, and make the file upload fail (use an oversized file; it is refused at once) | The oversized file never stages. Choose a smaller one |
| 1.2.15 | Choose **Initial status**: Pending, with a note (optional) | The product is created as Pending and shows in Requested Products. A note is optional for Pending |
| 1.2.16 | Choose Initial status **Rejected** or **Changes requested** | The Note box becomes required. Without it the browser stops you. A server note error would show under the box |
| 1.2.17 | Choose Initial status **Draft** | Created as Draft. It does not show in Requested Products |
| 1.2.18 | Choose a currency other than BDT (for example `USD`) | It shows on the detail page and prices use it. The box allows up to 8 characters |

### 1.3 SKUs (pricing and stock)

The first choice is **One price** (a single item) or **Has options** (sizes, colours: each combination gets its own price and stock).

| # | What to do | Expected |
|---|---|---|
| 1.3.1 | One price, enter price only | One card "SKU 1". The summary says "1 SKU" and "From ৳…" |
| 1.3.2 | One price with price 500, discounted price 450 | Saved. The detail page shows 450 with 500 struck out. "Charged now" in the edit form shows 450 |
| 1.3.3 | Enter a discounted price **above** the price | The field has a maximum equal to the price, and the server refuses it. The error shows under the field |
| 1.3.4 | Set discount dates, then clear the discounted price | The two date boxes clear and turn off. Dates mean nothing without a discount |
| 1.3.5 | Set a discount that starts in the future | After save, the detail page says "discount not started yet" and the buyer-facing price is the full price |
| 1.3.6 | Set a discount that already ended | "discount ended" |
| 1.3.7 | Set a discount window with the end before the start | Browser limits the pickers (the start cannot go past the end) and the server refuses a bad window |
| 1.3.8 | Enter stock 10, then clear it | Stock empty means "Not tracked". Stock 0 means sold out. They are different |
| 1.3.9 | Enter a product code, then use the same code on another SKU | Server error under "Product code (optional)": the code must be unique across the site |
| 1.3.10 | Has options: pick Size only, tick S and M | Two cards are generated, "Size S" and "Size M" |
| 1.3.11 | Has options: pick Size and Colour with two values each | Four cards (every combination) |
| 1.3.12 | Has options: pick an attribute but tick no value | Message: "Tick at least one value for every chosen attribute to generate the SKUs." Saving says to pick at least one value |
| 1.3.13 | Has options: pick no attribute, save | Banner: "Pick at least one attribute for the options, or choose “One price, no options”." |
| 1.3.14 | Remove one generated card, then press **Restore 1 removed combination** | The card comes back |
| 1.3.15 | With two or more new cards, use "Fill every SKU at once" with a price and stock | Only the boxes you fill are copied. You can still change each card |
| 1.3.16 | Untick **Active** on a SKU in a new product | The SKU is saved but hidden |
| 1.3.17 (edge) | Create a product with options, then switch to One price | The option choices reset (the form starts over for the pricing) |
| 1.3.18 | Open the product's edit page | Saved SKUs are kept as **Saved** cards. New ones show **New**. There is no Remove on a saved card, only the Active switch |
| 1.3.19 | In edit, tick another value of the same attribute | New combinations appear. The attributes already used are locked ("Every SKU of a listing must use the same attributes"). Used values cannot be unticked |
| 1.3.20 | In edit, change a saved SKU's price | Only that SKU is sent. "Charged now" shows the new effective price after saving |
| 1.3.21 | In edit, hide a SKU, save, open the detail page | The SKU shows hidden. The "From" price skips it. If every SKU is hidden the product shows no price |
| 1.3.22 | In edit, use "Fill the new SKUs at once" | Saved SKUs are never touched, so a price cannot change by accident |
| 1.3.23 (edge) | An attribute has no active values | The editor says "This attribute has no active values." |
| 1.3.24 (edge) | No active attributes exist | The editor says "No active attributes yet. Add some under Catalog → Attributes, or choose “One price”." |
| 1.3.25 (edge) | A value was deactivated after a product used it | It still shows ticked and locked, with "(inactive)" |

### 1.4 Price tiers (quantity prices, optional)

| # | What to do | Expected |
|---|---|---|
| 1.4.1 | Add a tier: min 10, max 49, price 90 | Saved. Shows on the detail page |
| 1.4.2 | Add a second tier: min 50, max empty, price 80 | Saved. A blank max means no limit |
| 1.4.3 | Add a tier with no min or no price | Message: "Fill the min quantity and the price of every tier, or remove the empty row." |
| 1.4.4 | Min quantity 0 or a decimal | "A tier's min quantity must be a whole number, 1 or more." |
| 1.4.5 | Max below min | "A tier's max quantity cannot be below its min quantity." |
| 1.4.6 | Price below 0 | "A tier's price must be 0 or more." |
| 1.4.7 | Tier discounted price above its price | "A tier's discounted price cannot be higher than its price." |
| 1.4.8 | Two tiers whose ranges overlap, such as 10 to 50 and 40 to 60 | "Price tier quantity ranges must not overlap." |
| 1.4.9 | A tier with no max that is not the last | "Only the last tier can have no max quantity." |
| 1.4.10 | Press Remove on a tier row, then save | The tier is gone. The list of tiers is replaced as a whole on every save |
| 1.4.11 | In edit, a product with two or more SKUs shows an **Applies to** box on each tier | The default is "Whole listing". You may point a tier at one SKU. Tiers are normally whole-listing |
| 1.4.12 (observe) | "Applies to" is not offered on create | A tier cannot point at a SKU before the SKU exists |

### 1.5 Product detail (`View Details`)

| # | What to do | Expected |
|---|---|---|
| 1.5.1 | Open a product | Header: title, Bangla title, status badge, from price. Buttons: **Update** and **Delete** |
| 1.5.2 | Look at the cards | Moderation, Thumbnail and gallery, change history, then Overview, Pricing and stock, Product details, Location and media |
| 1.5.3 | Overview | Listing format, category (as "Parent › Child"), owner, posted as, brand, model, origin and warranty (each with a Bangla line), title and description (and Bangla), slug, created, sent for review, last updated. Currency is in the Pricing and stock card |
| 1.5.4 | Pricing and stock | A table of every SKU (hidden ones greyed), with price, price now, discount window, stock and active state. The discount shows as Live now, Not started yet or Ended |
| 1.5.5 | Product details | Minimum order quantity, measurement unit, condition note, specifications, and tiers |
| 1.5.6 | Location and media | Place names, and the gallery tiles with an Open link. Empty gallery shows "No media uploaded." |
| 1.5.7 | Open a product id that does not exist, and a gig id, in the product detail address | "This listing was not found — it may have been deleted, or it is a gig (gigs are under Gigs)." with a back link. No crash |
| 1.5.8 | Open `/admin/catalog/listings/abc` | A not found page. No request with a bad id is sent |

### 1.6 Update a product (`Update`)

| # | What to do | Expected |
|---|---|---|
| 1.6.1 | Open Update | Every field starts with the saved value. The status is not editable here |
| 1.6.2 | Change only the title, save | You return to the detail page. The change shows. Status and note are unchanged |
| 1.6.3 | Save with no change | You return to the detail page. No request is sent |
| 1.6.4 | Change the category, owner, brand, measurement | Saved |
| 1.6.5 | Change one place field (for example the city) | All four place fields are sent together. The server refuses a place not on one branch (state must be in the country, and so on) with an error under the lower field |
| 1.6.6 | Change specifications only | Only the specifications are sent. Untouched specs are never rewritten |
| 1.6.7 | A product whose specifications are in an advanced shape | The form says they "use an advanced format, so they are kept as they are" |
| 1.6.8 | A brand was deactivated after attaching | It stays selectable, marked "(inactive)" |
| 1.6.9 | Try to give the product a title another live product of the same seller already uses | Title error with the "Open the existing listing" link |
| 1.6.10 (edge) | Edit an **approved** product | It stays approved. Edits by an admin never change the status |
| 1.6.11 | Change the thumbnail on the edit page (Files card) | See 1.8 |

### 1.7 Moderation (status changes)

On the detail page, the **Moderation** card shows the current status, a Note box, three decision buttons (**Approve**, **Request changes**, **Reject**), a "Move this listing back to" box (Pending or Draft), and the status history.

| # | What to do | Expected |
|---|---|---|
| 1.7.1 | On a Pending product, press **Approve** | Status becomes Approved. The note, if any, is cleared. History gets a new row. The product leaves Requested Products and the menu badge drops by one |
| 1.7.2 | Press **Reject** with no note | Message: "Write a note explaining why this listing is rejected." Nothing is sent |
| 1.7.3 | Press **Request changes** with no note | Message: "Write a note telling the owner what to change." |
| 1.7.4 | Reject with a note | Status Rejected. The note shows as the current note. History row has the note |
| 1.7.5 | Request changes with a note | Status "Changes requested" |
| 1.7.6 | Look at the button for the status the product already has | It is disabled. The hint says choosing the same status changes nothing |
| 1.7.7 | Move an Approved product back to **Pending**, then to **Draft** | Both work. A draft is not in the queue |
| 1.7.8 | After several moves, read the history | Newest first. Each row shows status, note, who (admin or seller, never which admin) and the time |
| 1.7.9 | Edit the product content or files, then read the two histories | Content, SKU and file changes show in the **change history** card (before and after), never in the status history |
| 1.7.10 (edge) | A note typed while pressing a decision that does not change the status | The note is ignored by the server |

### 1.8 Thumbnail and gallery

| # | What to do | Expected |
|---|---|---|
| 1.8.1 | Choose a thumbnail (JPG, PNG or WEBP) | Hint: "JPG, PNG or WEBP, up to 2 MB." Preview shows |
| 1.8.2 | Choose a 2.5 MB PNG | Refused at once: "… is 2.5 MB. Images can be up to 2 MB." |
| 1.8.3 | Add gallery files: JPG, PNG, WEBP, GIF, MP4, PDF | Hint: images 2 MB, videos 10 MB, PDFs 30 MB. Each over the limit is refused |
| 1.8.4 | Press **Replace** on the thumbnail | The new picture replaces the old one. The old file is deleted |
| 1.8.5 | Press **Remove** on the thumbnail, save | Thumbnail gone. The list row shows no picture |
| 1.8.6 | Mark gallery files **Remove**, then Undo on one, then save | A confirm says "Removed files are deleted for good. Save the changes?" Only the still-marked files go |
| 1.8.7 | Add files while the listing is Approved | The status stays Approved. A new row shows in the change history |
| 1.8.8 | Files on a listing a seller owns | Same. The admin's changes never move the status |

### 1.9 Requested Products (pending queue)

| # | What to do | Expected |
|---|---|---|
| 1.9.1 | Open **Requested Products** | Heading "Pending Listings (N)". N equals the menu badge. Only Pending products show |
| 1.9.2 | Look at the footer | "N listings shown" and **Load more** while more exist. There is no total (cursor paging) |
| 1.9.3 | Search, filter by seller, sort (Newest request, Oldest request, Newest created, Oldest created, Title A to Z, Z to A, id) | The list changes. **More filters** has category and the date ranges |
| 1.9.4 | A seller fixes a rejected product and saves | It returns to Pending, jumps to the top, and shows a **Resubmitted** badge (the request is clearly later than the creation) |
| 1.9.5 | **Review** on a row | Opens the detail page. The Back link returns to the queue |
| 1.9.6 | **Approve** on a row | A confirm: `Approve "…"? Buyers will be able to see it.` The row leaves. The product shows Approved in the main list |
| 1.9.7 | **Request changes** or **Reject** on a row | A dialog asks for the reason (required). Without it: "Write what the seller should change." or "Write a reason. The seller reads it to know what to fix." |
| 1.9.8 | Tick three rows and choose Approve, then **Approve selected** | Notice: "Approved 3 listings" (with ", N skipped" if some were not pending) |
| 1.9.9 | Tick rows and choose Reject, then **Continue…** | The reason dialog opens for the whole selection |
| 1.9.10 | The gig queue is untouched by any action here | Open Requested Gigs: the count is unchanged |
| 1.9.11 | Empty queue | "Nothing is waiting. New listings from sellers appear here." With filters on: "No pending listings match these filters." |

### 1.10 Bulk moderation (on the Product list)

| # | What to do | Expected |
|---|---|---|
| 1.10.1 | Tick two or more rows | A bar shows "N selected", an action box (Approve, Reject, Request changes), a note box, **Apply** and **Clear** |
| 1.10.2 | Choose Reject and leave the note empty | The note box is required (browser stops you). Placeholder says "Note (required)" |
| 1.10.3 | Choose Approve with a selection that includes one product already approved | Notice: "2 listings updated, 1 skipped (already approved)." plus the titles updated and skipped |
| 1.10.4 | Tick "Select all on this page", then page 2 | Selection can span pages. The result names the listings |
| 1.10.5 | **Clear** | The selection empties |
| 1.10.6 (edge) | Apply on a selection where the server answers an error | The error shows in the bar. Nothing is changed (the server does all or nothing) |

### 1.11 Delete a product

| # | What to do | Expected |
|---|---|---|
| 1.11.1 | **Delete** on a row, then Cancel on the confirm | Nothing changes |
| 1.11.2 | **Delete**, confirm: `Delete listing "…"? It will disappear from the list.` | The row disappears. The queue badge updates if it was pending |
| 1.11.3 | Open the deleted product's address | "Not found" message |
| 1.11.4 | Delete from the detail page | You return to the list |
| 1.11.5 (edge) | Reuse the deleted product's title for the same seller | Allowed. The title is free again |
| 1.11.6 (edge) | Delete a product that has the thumbnail | The thumbnail file is removed from storage. Gallery files stay |

---

## 2. Gigs

### 2.1 Gigs list (`/admin/gigs`)

| # | What to do | Expected |
|---|---|---|
| 2.1.1 | Open the list | Columns: picture, Title, Category, Owner, From, Status, Requested. Each row has **View Details** and **Delete**. The From column names what the rate is for, for example "From ৳450 / hour" or "From ৳9,000 fixed". A bare number is never shown |
| 2.1.2 | Search | Placeholder: "Search title, Bangla title or package code" |
| 2.1.3 | Filter by status, and press **Pending review** | The button switches to "Showing pending review". Press again to clear |
| 2.1.4 | Filter by price type (All, Hourly, Daily, Weekly, Monthly, Fixed price) | Only gigs with an **active** package of that type |
| 2.1.5 | Filter by category | The dropdown lists every service category. The server matches **exactly**, so a parent category shows only gigs filed directly under it |
| 2.1.6 | Filter by seller (seller picker) | Only that seller's gigs |
| 2.1.7 | **Date filters**: Created from and to, Requested from and to | Narrows the list |
| 2.1.8 | A product and a job | Never show here |
| 2.1.9 (observe) | The list has no Created column, only Requested | Created is available as a filter |

### 2.2 Create a gig (`+ Add Gig`)

Sections: Basics, Packages and pricing, Service details, Location, Thumbnail and gallery, Initial status.

| # | What to do | Expected |
|---|---|---|
| 2.2.1 | Save with the category empty | Banner: "Pick a service category for this gig." The picker shows **active service** categories only. A product category is not offered |
| 2.2.2 | Choose an owner and pick no seller | Banner: `Pick a seller, or choose "No owner".` |
| 2.2.3 | Leave a package's price empty, save | Banner "Fix the packages marked below, then save again." and "Enter the rate." beside the price |
| 2.2.4 | Create a gig with one Hourly package, rate 450 | Created and **Approved**. One package. List shows "From ৳450 / hour" |
| 2.2.5 | Create a gig with Hourly, Weekly and Fixed packages | Three packages. The "From" rate is the lowest active one |
| 2.2.6 | Look at the form | There is **no** stock box, no option picker and no quantity-price builder. There is no brand, model, warranty, measurement or condition field |
| 2.2.7 | Click **+ Add package** | A new card appears with the first price type nobody uses yet |
| 2.2.8 | Open the price-type box on a second card | A type used by another card is disabled and marked "(already used)" |
| 2.2.9 | Use all five types | **+ Add package** turns off, with "All five price types are used…" |
| 2.2.10 | A new, unsaved package with more than one card | A **Remove** button is there. It is not there for the only card |
| 2.2.11 | Leave the price type unchosen on a card | "Choose a price type." |
| 2.2.12 | Rate below 0 | "The rate must be 0 or more." |
| 2.2.13 | Discounted rate above the rate | "The discounted price cannot be higher than the rate." |
| 2.2.14 | Discount dates with no discounted rate, or equal to the rate | "A discount window needs a discounted price lower than the rate." |
| 2.2.15 | Discount ends before it starts | "The discount must end after it starts." |
| 2.2.16 | Fill a package description (and Bangla), and an optional package code like `CLEAN-HOURLY` | Saved. The code must be unique across the site |
| 2.2.17 | Fill Delivery days, Available from and to, Urgent, Package includes (and Bangla) | All show on the detail page |
| 2.2.18 | Fill the location | Same behaviour as products (one branch) |
| 2.2.19 | Stage a thumbnail and gallery before saving | They upload after the gig is created. If the upload fails, the gig is kept and you land on its edit page with the reason |
| 2.2.20 | Choose Initial status Pending, Rejected, Changes requested or Draft | Same rules as products (note required for the last two) |
| 2.2.21 (edge) | Same title for the same seller twice | The title error with a link "Open the existing gig (#N)". The rule is per kind: the same title as a product is fine |

### 2.3 Gig packages in update

| # | What to do | Expected |
|---|---|---|
| 2.3.1 | Open Update on a gig | Saved packages show as **Saved** with a "Charged now" line (for example "৳450 / hour") and the discount state |
| 2.3.2 | Change a saved package's rate | Only that package is sent. "Charged now" updates |
| 2.3.3 | Untick **Active** on a saved package, save | The package shows a **Hidden** badge and a **Show it again** button. The gig's "From" rate skips it |
| 2.3.4 | Try to add a new package of the type a hidden package already holds | Not possible: the type is disabled ("already used"). Use **Show it again** instead. If forced via the API the server answers: "Every gig SKU needs its own price type (two SKUs have the same one)." |
| 2.3.5 | Press **Show it again**, save | The package is live again and the rate can be edited |
| 2.3.6 | Add a new package of a free type | A **New** card is saved. The saved ones are not touched |
| 2.3.7 | Hide every package | The gig shows "No active package". It is allowed |
| 2.3.8 (edge) | Change a saved package's price type to a free type | Allowed |
| 2.3.9 (edge) | Try to swap the types of two saved packages in one save | Not possible, each type is "already used" by the other card |
| 2.3.10 (edge) | Clear a saved package's discounted rate | The discount is removed on save |
| 2.3.11 | A saved package has no remove button | Packages are never deleted |

### 2.4 Gig detail, moderation, files, queue, bulk, delete

These work exactly like Products. Run the cases in section 1 with these differences.

| # | What to check | Expected |
|---|---|---|
| 2.4.1 | Detail header | "Gig · service offer", a status badge, and "From ৳… / unit" |
| 2.4.2 | **Packages and pricing** card | The lowest active rate with its unit, then a table with Price type, Code, Rate, Rate now, Discount window, Description and Active/Hidden. Hidden packages are greyed and listed last |
| 2.4.3 | **Service details** card | Delivery days, urgent, availability dates, package includes (and Bangla) |
| 2.4.4 | Moderation | Messages say "gig": "Write a note explaining why this gig is rejected." Approve, Request changes, Reject, and the move back to Pending or Draft all work |
| 2.4.5 | The two histories | Package, content and file edits go to the change history, never the status history |
| 2.4.6 | Files | Same limits and buttons as 1.8. The thumbnail control uses the replace path. A second thumbnail replaces the first (the server's "add" call would refuse a second thumbnail, the replace call does not) |
| 2.4.7 | **Requested Gigs** | Heading "Pending Gigs (N)". Same columns idea as Requested Products, with a "From" rate. Search placeholder "Search title, Bangla title or package code". **More filters** has price type, category and dates. **Resubmitted** badge, Review, Approve (confirm), Request changes, Reject (reason required), bulk approve and reject, **Load more** |
| 2.4.8 | Approve one from the gig queue | It leaves the gig queue and shows Approved in the Gigs list. The **product** queue count does not change |
| 2.4.9 | Bulk approve three gigs where one is already approved | Notice "2 gigs updated, 1 skipped (already approved)." |
| 2.4.10 | Delete a gig (list or detail) | Confirm: `Delete gig "…"? It will disappear from the list.` Then the gig's address shows "not found" |
| 2.4.11 | Open a product id or a job id at `/admin/gigs/{id}` | "This gig was not found — it may have been deleted, or it is a product (products are under Listings)." No crash |
| 2.4.12 (edge) | Mix a product id into a bulk call (only possible with the API) | The server moves only the gig ids. The product id is ignored (it is in neither the updated nor the skipped list) |

---

## 3. Jobs

A job is a buyer's request for work. It is **never moderated** and **never deleted**. There is no approval step: a job is live (open for bidding) the moment it is posted.

### 3.1 Jobs list (`/admin/jobs`)

| # | What to do | Expected |
|---|---|---|
| 3.1.1 | Open the list | Columns: Title (with category, and an **Urgent** badge), Buyer (name and phone), Status, Budget, Bids, Created. Each row has **View Details**. There is no Delete |
| 3.1.2 | Search | Placeholder: "Search title, description, buyer name or phone". Searching by the buyer's phone finds the job |
| 3.1.3 | Filter by status: Open for bidding, Draft (paused), Pending (reopening), In progress (hired), Completed, Cancelled | Only that status shows |
| 3.1.4 | Filter by category (service categories) | Only jobs filed directly in that category (exact match) |
| 3.1.5 | Filter by buyer (buyer picker) | Only that buyer's jobs. The picker also fills from `?buyer=` in the link |
| 3.1.6 | Created from and Created to | Narrows the list |
| 3.1.7 | A job with no active budget row | The Budget column says "No active budget" |
| 3.1.8 | Page through | "Page N of M, X total", Previous and Next |
| 3.1.9 (observe) | The list has no Requested filter, sort control or Requested column | Not needed for jobs. A job has no review step |

### 3.2 Create a job (`+ Add Job`)

The sections are: Buyer, Basics, Service category, Budget, details, Location.

| # | What to do | Expected |
|---|---|---|
| 3.2.1 | Save with no buyer | Message under the buyer picker: "Say which buyer this job is for." Banner: "Pick the buyer this job is for." |
| 3.2.2 | Pick a buyer, no category | "Pick a service category for this job." |
| 3.2.3 | Leave the budget price empty | Rows are marked, banner: "Fix the budget rows marked below, then save again." |
| 3.2.4 | Create a job for a buyer with one budget row (Fixed, 1500) | Created. The detail page shows status **Open for bidding**. The form never offers a status |
| 3.2.5 | Create from a buyer link (`/admin/jobs/new?buyer=ID`) | The buyer is preselected |
| 3.2.6 | Fill delivery days, Needed from and until, Urgent, "What the job includes" (and Bangla), location | All show on the detail page |
| 3.2.7 | Budget rows | One row per price type, no duplicates ("Another row already uses this price type."). A price below 0 is stopped. No stock, no options, no discount |
| 3.2.8 | Add several price types | Each saved. The Budget column shows the cheapest active row |
| 3.2.9 (edge) | Posting a job, then looking at the buyer's own app | The job shows there as open |

### 3.3 Job detail and status moves

| # | What to do | Expected |
|---|---|---|
| 3.3.1 | Open a job | Header: title, "Job · a buyer's request for work", status badge, an Urgent badge when set, "Budget from …". Buttons: **Update** (may be disabled) |
| 3.3.2 | Cards | Status, Hired bid (only when hired), Overview, Budget, Bids |
| 3.3.3 | Overview | Buyer (name, phone, email), category, description (and Bangla), "What the job includes", delivery days, needed from and until, location, posted, last changed |
| 3.3.4 | Budget table | Price type, price, note, Active or Hidden |
| 3.3.5 | Bids card | "Bids (N)" with the bidder, status, quote and placed date. "Open in Bidding" opens `/admin/bidding?listing=ID`. If a job has more than 50 bids, the card shows the latest 50 and links to the rest |
| 3.3.6 | On an **Open for bidding** job, look at the Status card | Buttons: Pause (draft) and Cancel job are active. Move to pending and Mark complete are greyed with a reason on hover |
| 3.3.7 | Press **Pause (draft)**, confirm | Status becomes Draft. A paused job cannot take new bids |
| 3.3.8 | On the Draft job, look at the buttons | Move to pending and Cancel job are active. **Reopen for bidding** is greyed. Hover says: "A paused job must go through Pending before it opens again." |
| 3.3.9 | Press **Move to pending**, then **Reopen for bidding** | Pending, then Open for bidding |
| 3.3.10 | Press **Cancel job** on an open job | A dialog says every live bid is cancelled and this cannot be undone. The reason is **optional**. Confirm: the job is Cancelled and its pending bids show Cancelled |
| 3.3.11 | Look at a Completed or Cancelled job | Every status button is greyed ("A completed or cancelled job cannot change."). Update is disabled |
| 3.3.12 | Look at the "In progress" button | There is none. A job is hired only by accepting a bid |
| 3.3.13 | A hired (In progress) job | Only **Mark complete** and **Cancel job** are active. Update is disabled with the hint "A hired, completed or cancelled job cannot be edited. Use the status actions." |
| 3.3.14 | **Mark complete** on a hired job | Status Completed. The hired bid shows Completed |
| 3.3.15 | **Cancel job** on a hired job, leave the reason empty, submit | The dialog says "A reason is required to cancel a hired job." Nothing is sent. The label says "Reason (required)" |
| 3.3.16 | Same, with a reason | The job is Cancelled, the hired bid shows Cancelled, the other live bids are cancelled, and the bid's order is cancelled (there is no order screen to see it) |
| 3.3.17 | The "Last note" line | After a cancel with a reason, the reason shows as "Last note" |
| 3.3.18 | The **Hired bid** card | Appears once a bid is hired: "Bid #N · seller name", a link to the bid |
| 3.3.19 | Open a gig id or a product id at `/admin/jobs/{id}` | "This job was not found. It may be a product or a gig (those are under Listing)." |
| 3.3.20 (edge) | Open `/admin/jobs/abc` | A not found page |
| 3.3.21 (edge) | Double-click a status button | One request is sent |

### 3.4 Update a job

| # | What to do | Expected |
|---|---|---|
| 3.4.1 | Open Update on an open, draft or pending job | The form starts from the saved values. Text says "The buyer cannot be changed." |
| 3.4.2 | Change the title, add a second budget row, save | Both rows exist. The first is unchanged. Only changed fields are sent |
| 3.4.3 | Change the price of a saved budget row | Only that row is sent (by id) |
| 3.4.4 | Save with no change | Message: "Nothing has changed." |
| 3.4.5 | Open the edit address of a hired, completed or cancelled job | The page says the fields are locked ("Use the status actions on the job's page") and shows no form |
| 3.4.6 (edge) | A saved budget row cannot be removed | There is no Remove on a saved row |

---

## 4. Bidding

A bid is a seller's offer on a job. The admin may create or edit a bid on a seller's behalf, hire a bidder on the buyer's behalf (**Accept**), undo a hire (**Reject**), and withdraw a bid (**Cancel**). A bid is never deleted.

### 4.1 Bidding list (`/admin/bidding`)

| # | What to do | Expected |
|---|---|---|
| 4.1.1 | Open the list | Columns: Job (link), Seller (name and phone), Status, Quote, Placed. Each row has **View Details** |
| 4.1.2 | Look at the footer | "N shown" and **Load more** while more exist. There is no total (cursor paging). Do not expect page numbers here |
| 4.1.3 | Filter by status: Pending, Accepted, Rejected, Cancelled, Completed | Only that status shows |
| 4.1.4 | Filter by seller (picker) | Only that seller's bids. `?bidder=ID` in the link does the same |
| 4.1.5 | Open from a job's "Open in Bidding" link (`?listing=ID`) | A line says "Showing only the bids on job #ID" with "Open the job" and **Show all bids** |
| 4.1.6 | Press **Show all bids** | The job filter clears (a seller filter stays) |
| 4.1.7 | Sort: Newest first, Oldest first, Recently changed, Least recently changed | The order changes |
| 4.1.8 | Press **Load more** until the end | Every bid appears once. The button then goes away |
| 4.1.9 | A bid with two price options | The Quote column lists both, joined with " · " |
| 4.1.10 (observe) | The job filter has no picker, only the link | By design: it is driven by navigating from a job's page |

### 4.2 Create a bid (`+ Add Bid`)

| # | What to do | Expected |
|---|---|---|
| 4.2.1 | Save with no job and no seller | "Say which job this bid is for." and "Say which seller this bid is for." Banner: "Pick the job and the seller." |
| 4.2.2 | Open the job picker | Lists only **Open for bidding** jobs. A job opened from a link shows its title and status |
| 4.2.3 | Create a bid with one price option (Fixed, 1300) | Created as **Pending**. You land on its detail page |
| 4.2.4 | Create a second bid on the same job for a different seller | Created |
| 4.2.5 | Create a second **live** bid on the same job for the **same seller** | Server message: "This seller already has a live bid on this job." |
| 4.2.6 | Create a bid on a job that is not open | The picker does not offer it. If forced: "This job isn't open for bidding." |
| 4.2.7 | Two price options of the same price type | "Another row already uses this price type." |
| 4.2.8 | Price option with an hourly type and duration 0 or a decimal | "Use a whole number, 1 or more." (the browser may stop it first) |
| 4.2.9 | A fixed price option | The duration is always 1 |
| 4.2.10 | An hourly option, price 500, duration 3 | The detail page shows total 1,500 (price times duration) |
| 4.2.11 | Add no price option | "Add at least one price option." |
| 4.2.12 | Fill the message, proposed start and end | They show on the detail page |
| 4.2.13 | Create from a job's "+ Add a bid for a seller" button | The job is preselected |
| 4.2.14 (edge) | "+ Add a bid for a seller" on a job that is not open | The button does not show (it appears on open jobs only) |

### 4.3 Bid detail, Accept, Reject, Cancel

| # | What to do | Expected |
|---|---|---|
| 4.3.1 | Open a pending bid | Header "Bid #N", "seller on job" (link to the job), the bid status badge, and "Job: status". Buttons: **Accept**, **Update**, **Cancel bid** |
| 4.3.2 | Cards | Bid (seller, job, message, proposed and actual dates, placed, last changed, note) and Price options (type, price, duration, total, note, a **Hired** badge on the chosen one) |
| 4.3.3 | Links under the Bid card | Open the job, All bids on this job, Open the seller |
| 4.3.4 | **Accept** a bid with one price option | A dialog says it hires the seller on the buyer's behalf, the job moves to in progress, every other pending bid is rejected, and an order is created. It shows the price. Confirm |
| 4.3.5 | After accepting | A notice: "Bid accepted. Order #N was created (in progress), payable ৳…. There is no order screen yet, so this is the only place it is shown." The bid is Accepted. The job is In progress. The other pending bids are Rejected |
| 4.3.6 | Reload the page after accepting | The order notice stays on the page |
| 4.3.7 | **Accept** a bid with two or more price options | The dialog asks "Which price option is the buyer accepting?" with one radio each (type, price, duration, total). Submit without choosing: "Pick the price option you are accepting." Choose one and accept: the **Hired** badge sits on that option and the order's payable equals its total |
| 4.3.8 | Accept a bid on a job that is paused or not open | Server message in the dialog: "This job isn't open for bidding." |
| 4.3.9 | Look at an Accepted bid | Buttons: only **Reject (undo hire)**. Update and Cancel are not shown |
| 4.3.10 | Press **Reject (undo hire)** and submit with no reason | "A reason is required." Nothing is sent |
| 4.3.11 | Reject with a reason | The bid is **Rejected** (not Cancelled). The job returns to **Open for bidding**. The order is cancelled. Bids that lost earlier **stay Rejected** (they do not return to Pending) |
| 4.3.12 | **Cancel bid** on a pending bid | A dialog says the bid is withdrawn on the seller's behalf and the seller can place a new bid later. Confirm: the bid is Cancelled |
| 4.3.13 | A Rejected, Cancelled or Completed bid | No action buttons show |
| 4.3.14 | Accept the same bid twice quickly | One request is sent (the button disables while working) |
| 4.3.15 | Open a bid id that does not exist | "This bid was not found." with a back link |
| 4.3.16 (edge) | Accepting a non-pending bid (only via a stale page) | Server message "Only a pending bid can be accepted." shows in the dialog |
| 4.3.17 (edge) | Rejecting a non-accepted bid (stale page) | "Only an accepted bid can be rejected this way." |

### 4.4 Update a bid

| # | What to do | Expected |
|---|---|---|
| 4.4.1 | Open Update on a **pending** bid | The form starts from the saved values. The job and the seller cannot be changed |
| 4.4.2 | Change the message and add a price option | Saved. Only changed fields are sent. A new option includes its duration |
| 4.4.3 | Change a saved option's price | Only that option is sent (by id). Its total updates |
| 4.4.4 | Save with no change | "Nothing has changed." |
| 4.4.5 | Open the edit address of an Accepted, Rejected, Cancelled or Completed bid | The page says "This bid can no longer be edited (only a pending bid can)." and shows no form |
| 4.4.6 (edge) | A saved price option cannot be removed | No Remove on a saved option |

---

## 5. Cross-checks between the screens

| # | What to do | Expected |
|---|---|---|
| 5.1 | From a job, open one of its bids, then use the job link in the bid | You land back on the same job |
| 5.2 | From a bid, open the seller link | Opens `/admin/sellers/{id}` |
| 5.3 | The job's "Bids (N)" count | Equals every bid ever placed on it, in any status |
| 5.4 | Accept a bid, then open the job | Status In progress, a **Hired bid** card with a link, Update disabled |
| 5.5 | Reject the hire, then open the job | Status Open for bidding again, no Hired bid card |
| 5.6 | Cancel a hired job, then open the bids | The hired bid and the other live bids show Cancelled |
| 5.7 | Look at the menu badges while you approve and reject products and gigs | The Product badge and the Gig badge change independently |
| 5.8 | Sign out in another tab, then press any action | You go to the admin login page |
| 5.9 | Open each page at 390 px width (phone) | No sideways scrolling of the page. Tables scroll inside their own box |

---

## 6. End-to-end walkthroughs

### 6.1 A product from creation to approval

1. A seller creates a product with two sizes. It shows in **Requested Products** with the badge increased by one.
2. As admin, open **Review**. Check the SKU table (two SKUs, prices, stock), the tiers and the files.
3. **Request changes** with the note "Add a clear photo."
4. As the seller, open the product, see the note, add a photo and save. The product returns to Pending with a **Resubmitted** badge at the top of the queue.
5. As admin, **Approve**. The product leaves the queue. Read the status history: Pending, Changes requested, Pending, Approved. Read the change history: the photo added.

### 6.2 A gig with a hidden package

1. Create a gig with Hourly (450) and Fixed (9000) packages, owner a seller. It is Approved.
2. Edit: hide the Hourly package. The list now shows "From ৳9,000 fixed".
3. Edit again: try to add a second Hourly package. The type is "already used". Press **Show it again** instead, and change the rate to 500.
4. The list shows "From ৳500 / hour".

### 6.3 A job through hiring, undo and cancel

1. Create a job for a buyer with a Fixed budget of 1500. Status is Open for bidding.
2. Add a bid for seller A (one option, Fixed 1300) and a bid for seller B (two options, Hourly 200 times 5 and Fixed 1100).
3. Try to add a second live bid for seller A. It is refused.
4. Accept A's bid. Job In progress. B's bid Rejected. The notice shows Order # and payable 1,300.
5. Try to edit the job. Update is disabled.
6. Reject A's hire with a reason. Job Open for bidding. A's bid Rejected. B's bid **stays Rejected**.
7. Add a new bid for seller B (two options). Accept it and pick the Fixed 1100 option. Payable 1,100.
8. Press **Cancel job** with no reason: blocked. Cancel with a reason: job Cancelled, B's bid Cancelled.

### 6.4 A paused job

1. Pause an open job. Try to add a bid from the Bidding page: the job picker does not list it.
2. Try Reopen: greyed. Move to pending, then Reopen. The job is Open for bidding and takes bids again.

---

## 7. Things to know, and things to report

### Behaviour that is on purpose

- **No approval for jobs.** A job is live as soon as it is posted. There is no admin approval step.
- **Admin-created products and gigs are Approved.** The admin may pick another initial status. A job cannot have one chosen.
- **The category filter is an exact match.** It does not include sub-categories, on Products, Gigs and Jobs. The dropdown lists every category so you can filter by any of them.
- **SKUs, packages, price options and budget rows are never deleted.** SKUs and packages can be hidden. Bids' price options and budget rows cannot be hidden from the form.
- **The gig thumbnail control replaces.** A second thumbnail on a gig replaces the first.
- **Edit by an admin never changes the status.** Only the Moderation card (or the queue, or bulk) moves it.
- **No Order screen yet.** The Accept notice is the only place the order id and payable are shown.

### Report these

- A page that crashes or shows a blank screen on a bad id.
- A status button that is active when the move is not valid, or greyed when it is valid.
- A required field (note on reject, reason on a hired-job cancel, buyer on a job, job and seller on a bid) that can be left empty and sent.
- A message that shows in the wrong place, or no message at all after a failed save.
- A count (menu badge, queue heading, "Bids (N)") that disagrees with the list.
- A file over the limit that is accepted, or under the limit that is refused.
- Sideways scrolling of the page at phone width.
