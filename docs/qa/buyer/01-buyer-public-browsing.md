# QA Guide 1: Buyer Web, Public Browsing

This guide tells you how the public browsing part of the buyer website works and how to test it. It lists every screen, every rule, and every test case, including the odd ones. You do not need to read any code.

## 1. What this feature is

"Public browsing" is everything a visitor can do on the buyer website **without logging in**:

- Look at the home page.
- Walk through the category tree.
- Browse the list of products and the list of services (called "gigs" in the system).
- Filter, search and sort those lists.
- Open one product, one service, or one seller's page.

A visitor can look at all of this. A visitor cannot buy anything here. Buying (cart, favourites) is covered in Guide 2.

The word **service** and the word **gig** mean the same thing. The screen says "Service".

## 2. Before you start

### 2.1 Where to open it

Every buyer page starts with `/buyer`. Example: `http://localhost:3000/buyer`.

| Page | Address |
|---|---|
| Home | `/buyer` |
| All categories | `/buyer/categories` |
| One category | `/buyer/category/<id>` (may end with `?trail=1,5`) |
| All products | `/buyer/products` |
| One shop of products | `/buyer/products/used-mall`, `/buyer/products/village-product`, `/buyer/products/retail-shop`, `/buyer/products/wholesale-shop`, `/buyer/products/brand-wall` |
| One product | `/buyer/product/<id>/<slug>` |
| All services | `/buyer/services` |
| One service | `/buyer/service/<id>/<slug>` |
| One seller | `/buyer/seller/<id>` |

The `<slug>` part at the end is only for looking nice. The page loads by the **id**. A wrong or missing slug must still work.

### 2.2 No login needed

Test every page in a window where nobody is logged in. Also test a few pages while logged in as a buyer; they must look the same.

### 2.3 The data you need

The pages show whatever is in the database. To test well, make sure the database has:

1. Service categories and product categories, several levels deep, and at least one category with no children (a "leaf").
2. Products in each of the five shops (Used Mall, Village Product, Retail Shop, Wholesale Shop, Brand Wall) and a few with no shop type ("General").
3. A product with **options** (for example Size and Colour) and several variants: one variant sold out, one with a discount.
4. A product with **no options** (a single price).
5. A wholesale product with **quantity price tiers** (for example 1 to 9 pieces, 10 or more).
6. A product that is **sold out** completely.
7. A product that belongs to the platform itself (no seller). The page shows "Sold by Egoola".
8. Services with different rate types (hourly, daily, weekly, monthly, fixed), one marked urgent, one with several packages.
9. At least 25 products and 25 services, so that there is more than one page of results.
10. Sellers: one with business and contact details filled in, one with none filled in, one whose status is pending, one that is suspended or paused.
11. Locations: products or services in different districts and thanas.

Only **approved** listings from **active** sellers must show up on the public pages. This is the most important rule on these pages. Test it.

## 3. How the pages work

### 3.1 Rules shared by all list pages

- **Everything is kept in the address bar.** The search words, filters, sort order, and page number are written into the URL. Because of that: the Back button works, a reload keeps the same view, and a copied link shows the same list.
- **Pages are numbered.** The list shows a row of numbers with Previous and Next. The first page has no `page` in the URL.
- **A page past the last one.** If someone types `?page=99` and there are only 3 pages, the page shows: "There are no more products to show." (or "services", "favourites") and a button "Back to the first page". It must **not** show a crash or a blank page.
- **Loading.** While the list loads, the old list fades and "Loading…" shows when there is nothing yet.
- **Empty list.** If a filter matches nothing, the page says "Nothing matches these filters." If there is nothing at all, it says "There are no products to show yet." These two messages must not be mixed up.
- **Failed load.** If the server is down, the page says "We couldn't load this list. Please try again." It must not stay on "Loading…" forever.
- **Bad filter.** If the server rejects a filter (for example, "price from" bigger than "price to"), the server's own sentence is shown under the filters.
- **Optional `page_size`.** The address may carry `?page_size=5`. Allowed values are 1 to 100. Anything else (0, 101, abc) falls back to the normal size of 20.

### 3.2 Home page (`/buyer`)

What the visitor sees, top to bottom:

1. **A strip with "All Category".** It opens the services list.
2. **Category sidebar** (desktop). It lists the top-level **service** categories with their pictures. Hovering one shows its sub-categories. Clicking one opens that category.
3. **A switch "Services / Projects".** "Projects" goes to a page that is not built yet (see section 7).
4. **District and thana drop-downs.** The country is fixed to Bangladesh. Choosing a district fills the thana drop-down with that district's thanas. These two drop-downs only fill each other. **They do not filter the services below.** This is how it works today; do not report it as a bug.
5. **Banner slider.** Two pictures that change by themselves every 5 seconds.
6. **Shop icons and shop buttons.** Five icons and five green buttons for the five product shops. Each opens that shop's product list.
7. **Mobile section** (narrow window): a search box and a grid of category tiles. It shows 12 tiles; a down-arrow shows all, an up-arrow folds them back. The search box sends the visitor to the services list with that search.
8. **"Top Seller" and "Top Buyer" blocks.** Four and two services taken from the newest services. Each links to the service.
9. **"N Services Available".** N is the total number of services. Under it are the first 12 services as cards.
10. A "Short By" button is shown, but it **does nothing yet**. Do not report it.

Each block loads on its own. If one call fails, the rest of the home page must still show.

### 3.3 Categories (`/buyer/categories` and `/buyer/category/<id>`)

- **Top level.** Shows the first level of categories as tiles, 24 per page. Each tile shows the name, the Bangla name (if any), and "Products" or "Services". A small arrow on the tile means it has sub-categories.
- **Kind buttons** (only at the top level): All, Products, Services. The selected one is highlighted. Choosing one starts again from page 1.
- **Search box.** Waits about a third of a second after typing, then searches. A new search starts at page 1.
  - At the **top level** it searches **every depth** of the tree.
  - **Inside a category** it searches only the **direct children** of that category.
  - No result: `No category matches "xyz".` This is not the same as "Loading".
- **Clicking a tile.**
  - Tile with an arrow: opens that category and shows its children one level deeper.
  - Tile without an arrow (a leaf): goes straight to the product or service list filtered by that category.
- **Breadcrumb.** "All categories / Parent / Child". Every part except the last is a link.
- **"See everything in <name>" button** (inside a category). Opens the product or service list for that category. The list includes **every sub-category below it**, not only the direct level.
- **Opening a leaf's own page.** If someone opens `/buyer/category/<leaf id>` directly, the page says "<name> has no sub-categories. Its listings are next." with a button "See products" or "See services".
- **Unknown id.** "This category was not found."
- **The `trail` in the address.** Links inside the site carry `?trail=1,5` (the parent ids, top first). It is used to show the breadcrumb names. If a visitor opens a category by id only (no trail), the page works, but the breadcrumb only shows "All categories" and no parent names. **This is a known limit** (section 7).

### 3.4 Product list (`/buyer/products` and the five shop pages)

Header: the title ("Products", or the shop name such as "Used Mall"), the result count ("18 results", "1 result"), and a **Sort by** drop-down: Newest first (default), Oldest first, Price: low to high, Price: high to low, Title A–Z.

Chips under the header:

- "Category: <name> ✕" appears when a category filter is active. The ✕ removes it.
- "Seller: <name> ✕" appears when filtered by a seller. The ✕ removes it.
- A "Browse categories" link.

Filter box on the left (press **Apply** to use it; **Clear** removes all filters):

| Filter | What it does |
|---|---|
| Search | Looks in the title, brand and model |
| Shop | All shops, or one of the five, or General. **This drop-down is hidden on a shop page**, because the shop is already fixed |
| Stock | In stock or sold out / In stock only / Sold out only |
| Price from, Price to | Price range |
| Country, division, district, thana | Location. Each drop-down fills after the one above is chosen. Changing one empties the ones below it |

Filters are not sent on every keystroke. They are sent when the visitor presses Apply (or Enter).

**Product card** shows: picture, title, price (the old price is crossed out when there is a discount), a green "In stock" or grey "Sold out" badge, the seller's name (a link to the seller page), a heart "Like", and a link to the product.

### 3.5 Service list (`/buyer/services`)

Same as the product list, with these differences:

- Filters: Search ("What do you need?"), **Rate type** (Hourly, Daily, Weekly, Monthly, Fixed price), **Delivered within (days)**, **Urgent only** checkbox, price range, location.
- No Shop or Stock filter.
- **Service card** shows: picture, title, starting price with the rate ("/ hour"), a red "Urgent" badge when urgent, delivery days, the seller, the heart "Like", and a hire link (see section 7).

### 3.6 Product page (`/buyer/product/<id>/<slug>`)

- **Breadcrumb:** Products / shop name / category. The category link opens the product list for that category.
- **Pictures.** A big picture with small pictures under it when there is more than one. Clicking a small picture changes the big one. Videos and documents are not shown. With no picture, a "no image" picture shows.
- **Badges:** shop type, brand, category.
- **Option picker** (only when the product has options such as Size and Colour):
  - Each option group lists its values as buttons.
  - A value that no variant offers together with what is already chosen is **greyed out and cannot be clicked** (its tooltip says "Not available with the other choices").
  - Clicking a chosen value again un-chooses it.
  - Until every group has a choice, the page shows "From <lowest price>" and the line "Pick every option to see its price and stock."
  - After every group is chosen, the page shows that variant's own price, a stock badge ("Sold out", "In stock", or "N available") and the product code.
  - If the chosen mix does not exist, the page says "This combination is not offered."
- **Product with no options:** shows the price and stock of its only variant straight away.
- **Price:** when a discount runs, the old price is crossed out and the new price is shown large.
- **Add to cart box** (more in Guide 2). Quantity starts at the product's **minimum order quantity**. The button is off, with a grey reason underneath, when: not every option is picked ("Pick every option to add it to your cart."), the combination is not offered, or the variant is sold out ("This option is sold out.").
- **"All combinations (N)"** is a fold-out table of every variant with price and stock.
- **Like** link (the heart). See Guide 2.
- **"Sold by"** block with the seller's picture and name, linking to the seller page. A product with no seller says "Sold by Egoola".
- **Location line** (thana, district, division, country) when known.
- **"Buy more, pay less" table.** Shown only when the product has quantity tiers: "1–9", "10 or more", with the price each, and a crossed-out price when discounted.
- **Description and specification.** The description keeps its line breaks. The table shows only the facts that exist: Model, Made in, Warranty, Sold by the (unit), Minimum order, Condition, and any extra attributes.

### 3.7 Service page (`/buyer/service/<id>/<slug>`)

- Breadcrumb: Services / category.
- Badges: Urgent, "Delivered in N days", category.
- "From <price> / <unit>" is the **lowest** package price.
- "Available: <from> to <to>" appears only when dates exist. With only a start date it says "onwards".
- **Packages table.** One row per rate the seller offers: radio button, rate name, price (old price crossed out when discounted), and a description. The **cheapest package is chosen at the start**. Choosing another row changes what Add to cart will add.
- Add to cart box. For an **hourly, daily, weekly or monthly** package, a "How many hours/days/weeks/months" box shows. For a **fixed price** package there is no number box.
- "About this service" and "What is included".

### 3.8 Seller page (`/buyer/seller/<id>`)

- Picture, name, "Member since <Month Year>", and the place.
- Two big buttons: the number of **Products** and the number of **Services** this seller has. Each opens that list already filtered by this seller (the "Seller: <name> ✕" chip shows).
- **Business box:** type, what they sell, year started, team size, description. The whole box is **hidden** when every business field is empty.
- **Contact box:** public email, WhatsApp, Facebook, WeChat, Skype. Only the filled lines show. The whole box is **hidden** when all are empty.
- **Skills**, **Education**, **Experience** boxes appear only when they have items.
- A seller who is pending, paused or suspended: the page says "Seller not found". Their products and services are also gone from every list.

### 3.9 Location drop-downs

- Four levels: country, division (state), district (city), thana.
- Each level loads when the one above it is chosen. Changing a higher level empties the lower ones.
- A district with no thanas is normal; the thana list is just empty.
- The system walks through all the pages of a level behind the scenes, so a level with a very large number of rows is not cut short.

## 4. Test cases

Mark each case Pass or Fail. Write down the address and a screenshot for every Fail.

### 4.1 Home page

| ID | Steps | Expected |
|---|---|---|
| BR-01 | Open `/buyer` logged out | Page loads. Sidebar categories, banner slider, five shop icons, service cards all show. No red error |
| BR-02 | Hover a category in the sidebar | Its sub-categories appear |
| BR-03 | Click a sidebar category | The category page opens |
| BR-04 | Wait on the banner | The picture changes about every 5 seconds |
| BR-05 | Click each of the five shop icons and buttons | Each opens its own shop list (`/buyer/products/<shop>`) |
| BR-06 | Choose a district | The thana drop-down fills with that district's thanas only. The service cards do not change |
| BR-07 | Change the district again | The thana list is replaced (not added to) |
| BR-08 | Check "N Services Available" | N equals the count shown on `/buyer/services` |
| BR-09 | Narrow the window to phone width | The mobile search and category tiles show. 12 tiles first; the down-arrow shows all; the up-arrow folds back |
| BR-10 | Type a word in the mobile search and submit | The services list opens with that word as the search |
| BR-11 | Stop the backend, reload the home page | The page does not crash. Blocks that cannot load are empty |

### 4.2 Categories

| ID | Steps | Expected |
|---|---|---|
| BR-20 | Open `/buyer/categories` | Top-level categories only. An arrow shows exactly on those with children |
| BR-21 | Press Products, then Services, then All | The list changes to the kind chosen. Page goes back to 1 |
| BR-22 | Click a tile with an arrow | Opens that category. Children shown. Breadcrumb "All categories / Name" |
| BR-23 | Go three levels deep | Breadcrumb shows every parent as a link. Clicking a parent goes back to it |
| BR-24 | Click a leaf tile | Goes to the product/service list with the "Category: <name>" chip |
| BR-25 | Open a leaf by its own address | Message "<name> has no sub-categories…" and the "See products/services" button |
| BR-26 | Search at the top level for a word that is only in a deep category | The deep category is found (searches every depth) |
| BR-27 | Search the same word inside a category | Only that category's direct children are matched. The deep one is not found |
| BR-28 | Search for nonsense | `No category matches "…".` Not "Loading" |
| BR-29 | Type fast and watch the network | Not one call per letter. One call after a short pause |
| BR-30 | More than 24 categories at one level | Pager shows. Page 2 works. Search resets to page 1 |
| BR-31 | "See everything in <name>" | List includes products/services of all sub-categories below |
| BR-32 | Open `/buyer/category/999999` | "This category was not found." |
| BR-33 | Open `/buyer/category/abc` | A 404 page |
| BR-34 | Open a category by id with no `?trail=` | Page works. Breadcrumb shows less (known limit). No crash |

### 4.3 Product list

| ID | Steps | Expected |
|---|---|---|
| BR-40 | Open `/buyer/products` | Count equals the number of approved products. Hidden, pending or rejected products are not there |
| BR-41 | Compare the count with the number of cards across all pages | They match |
| BR-42 | Click a shop page, e.g. Used Mall | Only that shop's products. The Shop drop-down is hidden |
| BR-43 | Open `/buyer/products/not-a-shop` | A 404 page |
| BR-44 | Search by a title word, brand name, model | Matches by each |
| BR-45 | Stock: In stock only / Sold out only | Cards match; badges agree |
| BR-46 | Price from 100 to 500 | Only products inside the range |
| BR-47 | Price from 500 to 100 | The server's message is shown under the filters. The list does not crash |
| BR-48 | Price from empty, to 200 | Works with only one end |
| BR-49 | Each of the five sort options | Order is right. Price sort uses the shown price |
| BR-50 | Apply a filter, press Back | The previous filter state returns, and the form shows the old values |
| BR-51 | Copy the URL of a filtered list into a new tab | Same list, same filter values in the form |
| BR-52 | Press Clear | All filters, the category chip and the seller chip are removed |
| BR-53 | Press ✕ on the Category chip | Only that filter goes away |
| BR-54 | Choose a country, then a division, then a district | Each drop-down fills after the one above. Thana sends all three parents |
| BR-55 | Change the country after choosing a district | State, district and thana are emptied |
| BR-56 | Go to page 2 and 3 with the pager | Right products. Previous disabled on page 1, Next disabled on the last |
| BR-57 | Change a filter while on page 3 | Goes back to page 1 |
| BR-58 | `?page=999` | "There are no more products to show." and "Back to the first page" button. The button returns to page 1 |
| BR-59 | `?page=0`, `?page=-1`, `?page=abc` | Treated as page 1. No crash |
| BR-60 | `?page_size=5`, `?page_size=100`, `?page_size=0`, `?page_size=101` | 5 per page, 100 per page, then 20 per page for the last two |
| BR-61 | Category filter on a parent category | Includes products of its sub-categories |
| BR-62 | Filter by a seller (from the seller page) | Only that seller's products. "Seller: <name> ✕" chip shows |
| BR-63 | A filter that matches nothing | "Nothing matches these filters." |
| BR-64 | Fast clicks on filters | The list ends on the last choice (no old answer overwrites a newer one) |
| BR-65 | A product with a discount | Old price crossed out, new price shown |
| BR-66 | A sold-out product | Grey "Sold out" badge |
| BR-67 | Stop the backend, reload | "We couldn't load this list. Please try again." |

### 4.4 Service list

| ID | Steps | Expected |
|---|---|---|
| BR-80 | Open `/buyer/services` | Count equals approved services. Hidden ones are absent |
| BR-81 | Rate type = Hourly | Only hourly services. Price shows "/ hour" |
| BR-82 | Each other rate type | Same check: daily "/ day", weekly "/ week", monthly "/ month", fixed has no unit |
| BR-83 | Delivered within 3 days | Only services that deliver in 3 days or less |
| BR-84 | Urgent only | Only services with the red "Urgent" badge |
| BR-85 | Delivered within 0 or a letter | Browser stops the entry (min 1), or the server message shows |
| BR-86 | Search, price range, sort, location, pager | Same behaviour as BR-44 to BR-60 |
| BR-87 | Past-end page | "There are no more services to show." |

### 4.5 Product page

| ID | Steps | Expected |
|---|---|---|
| BR-100 | Open a product with Size and Colour options | Two option groups. Price shows "From …" and the hint line |
| BR-101 | Pick Size only | Colours that do not exist for that size are greyed out and cannot be clicked |
| BR-102 | Pick both | That variant's own price, stock badge and code show |
| BR-103 | Click the chosen value again | It un-chooses; the price goes back to "From …" |
| BR-104 | Pick a sold-out variant | Badge "Sold out"; the Add to cart button is off with "This option is sold out." |
| BR-105 | Pick a discounted variant | Old price crossed out |
| BR-106 | Open "All combinations" | Every variant with price and stock |
| BR-107 | Product with no options | Price and stock show at once; no picker |
| BR-108 | Wholesale product | "Buy more, pay less" table with ranges ("1–9", "10 or more") |
| BR-109 | Product with several pictures | Small pictures switch the big one. Active small picture has a green border |
| BR-110 | Product with no picture | "No image" picture, no crash |
| BR-111 | Product with no seller | "Sold by Egoola" and no link |
| BR-112 | Click the seller block | Seller page opens |
| BR-113 | Breadcrumb links | Products, shop and category links work |
| BR-114 | Product with no description / no specs | "No description." and no empty table |
| BR-115 | Open a **service id** at `/buyer/product/<service id>` | "Product not found" |
| BR-116 | Open a missing id | "Product not found" |
| BR-117 | Open `/buyer/product/abc` | A 404 page |
| BR-118 | Open the product with a wrong slug | Page still loads |
| BR-119 | Open a hidden (pending/rejected) product by id | "Product not found" |
| BR-120 | Open a product of a suspended or paused seller | "Product not found" |

### 4.6 Service page

| ID | Steps | Expected |
|---|---|---|
| BR-140 | Open a service with 3 packages | Table of 3 rows. The cheapest is selected at the start |
| BR-141 | Choose another package | The radio moves. The Add to cart box matches the choice |
| BR-142 | Hourly package | A "How many hours" box shows |
| BR-143 | Fixed price package | No number box |
| BR-144 | Service with dates | "Available: <date> to <date>"; only a start date says "onwards" |
| BR-145 | Urgent service | Red "Urgent" badge |
| BR-146 | Open a **product id** at `/buyer/service/<product id>` | "Service not found" |
| BR-147 | Missing id, `abc`, hidden service | "Service not found" / 404 page |

### 4.7 Seller page

| ID | Steps | Expected |
|---|---|---|
| BR-160 | Open a seller with business and contact filled | Both boxes show with only the filled lines |
| BR-161 | Open a seller with no business or contact data | Both boxes are completely hidden (no empty box) |
| BR-162 | Seller has only a WhatsApp number | Contact box shows only WhatsApp |
| BR-163 | Click the "Products" and "Services" buttons | The lists open with the seller chip; counts on the buttons equal the list counts |
| BR-164 | Pending seller | "Seller not found" |
| BR-165 | Suspended or paused seller | "Seller not found" |
| BR-166 | A seller with 0 products | The button shows 0 and the list says nothing to show |
| BR-167 | `/buyer/seller/abc`, `/buyer/seller/0` | 404 page |
| BR-168 | Seller with no profile picture | The "no image" picture shows |

### 4.8 General checks

| ID | Steps | Expected |
|---|---|---|
| BR-180 | Open the browser console on every page above | No red errors |
| BR-181 | Use Back/Forward through a long browse | Each step returns to the right view |
| BR-182 | Phone width on every page | No sideways scrolling; filters stay usable |
| BR-183 | Slow network (browser throttling) | "Loading…" shows, then the data. No flicker of wrong content |
| BR-184 | Reload a page that has filters | Same view |
| BR-185 | Bangla names | Bangla category names show next to the English name where they exist |

## 5. Corner cases to try on purpose

- Type spaces only in a search box. It must act like an empty search.
- Type a very long search (200+ letters). No crash.
- Type special characters (`&`, `#`, `%`, quotes) in a search or in a category name. The address and the list stay correct.
- Open two tabs with different filters and change one. The other must not change.
- Click Apply many times fast. The list ends in the right state.
- Open a product while another tab changes its stock (admin or seller). After reload the badge is right.
- A category name with special characters in "See everything" link (`cname`). The chip shows the name correctly.
- Product with ten or more option groups or values. The buttons wrap and stay readable.
- A very long product title. It is cut with "…" on the card and fully shown on the product page.
- A price with decimals (e.g. 99.50). Shows as 99.50; whole prices show without ".00".

## 6. What "correct data" means (quick rules)

- Only **approved** listings from **active** sellers are public.
- The number "N results" must equal the real number of matching listings, and the sum of cards over all pages must equal N.
- Prices on a card, on the detail page and in the cart must agree.
- Prices are in taka, shown like `1500 ৳`.

## 7. Known gaps (not bugs; do not report)

These are not built yet or are limits of the server today:

1. **No "get one category" call on the server.** A category opened by id alone has a short breadcrumb.
2. **No public brand list.** The brand filter works from the address (`?brand=<id>`), but there is no drop-down. Brand names can be found with the search box.
3. **Not built yet:** the Hire/order page (the "hire" link on a service card goes to `/buyer/hire/<id>`, which shows a 404 page), Projects (`/buyer/projects`), Orders, Messages, Notifications, Profile, the Register page (`/register`), the header search box, and the "Short By" button on the home page.
4. **Home district/thana drop-downs** do not filter the services.
5. The banner pictures and shop icons are fixed pictures, not loaded from the server.

## 8. How to report a bug

Please write: the test ID, the full address, the steps, what you expected, what you saw, a screenshot, whether you were logged in, and the browser. If a message in red came from the server, copy it exactly.
