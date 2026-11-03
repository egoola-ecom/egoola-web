# Buyer Web: notes and future enhancements

This folder holds the notes for the buyer website (`/buyer/...`). Test records
live one level up in `docs/` (`buyer-browsing-tests.md`,
`buyer-cart-wishlist-tests.md`). This file lists what the buyer site does today
and the backend additions that would improve it. None of them is needed for the
site to work.

## What exists today

| Area | Routes | Client files |
|---|---|---|
| Categories | `/buyer/categories`, `/buyer/category/[id]?trail=` | `src/lib/buyer/public-categories-api.ts` |
| Products | `/buyer/products`, `/buyer/products/[shop]`, `/buyer/product/[id]/[slug]` | `public-products-api.ts` |
| Services (gigs) | `/buyer/services`, `/buyer/service/[id]/[slug]` | `public-gigs-api.ts` |
| Seller page | `/buyer/seller/[id]` | `public-sellers-api.ts` |
| Geography | location pickers on the product and service filters | `public-geography-api.ts` |
| Cart | `/buyer/cart` (login required) | `cart-api.ts` |
| Favourites | `/buyer/favourites` (login required) | `favourites-api.ts` |

All public routes need no login. Lists are page-based
(`{count, page, page_size, total_pages, results}`) except the four geography
lists, which are limit/offset (`{count, next, previous, results}`). The
geography client walks `offset` until `next` is null, so a level with more than
500 rows is not cut off.

A page past the last one shows "There are no more ... to show" with a button
back to the first page. It does not redirect.

## Enhancement 1: "get one category" endpoint

### What is missing

The backend has no call that returns a single category. The only category call
is the list, `GET /public/catalog/categories/`, which returns the children of
one parent (or the top level when no `parent_id` is given).

### Why it matters

The category page `/buyer/category/[id]` needs the category's name and the
names of its ancestors for the breadcrumb. With no single-category call, the
page works them out like this:

1. Every category link inside the app carries `?trail=` (the ancestor ids,
   root first).
2. `resolveCategoryChain` (in `public-categories-api.ts`) takes that trail plus
   the current id. For each id it fetches the parent's list of children
   (`page_size=100`) and finds the id in it, starting from the top level.
3. That costs one list call per level of depth, and it only works when the
   trail is present.

### When it is a problem

Only when a category page is opened by its id alone, with no `?trail=`:

- a typed or bookmarked `/buyer/category/<id>` URL;
- a shared link whose query string was stripped;
- a future link from somewhere that only knows the category id (for example a
  product's category chip, if one is added).

In those cases the page still loads and still lists the category's children.
Only the breadcrumb is short: the ancestors and the category's own name are not
shown, because there is no way to look them up by id.

### What it does not break

- Normal browsing is complete. Drilling down always carries the trail.
- Product and service lists filtered by category work from the id alone.
- Nothing crashes. This is a cosmetic gap, not a broken screen.

### What the endpoint would give us

Suggested contract: `GET /public/catalog/categories/{id}/` returning the same
row as the list (`id, parent, type, name, name_bn, slug, image_url, sort_order,
has_children`), with the same visibility rule (404 if the category is inactive
or sits under an inactive one). With `parent` in the row, the client can climb
to the root with one call per level, or the backend can add an `ancestors`
array and make it one call in total.

Once it exists:

- replace the list walk in `resolveCategoryChain` with the new call;
- the `?trail=` query parameter becomes optional and can be dropped from links;
- deep links look the same as in-app clicks.

## Enhancement 2: public brand list

### What is missing

The backend has no public list of brands. A product row carries
`brand{id, name}` (or `null`), and the product list accepts `?brand=<id>`, but
a buyer cannot discover which brand ids exist.

### Where brand shows in the UI today

- Product detail: a badge with the brand name, from the product's own data.
- Search box placeholder ("Title, brand or model"). The server search already
  matches the brand name, so typing a brand name finds its products.
- "Brand Wall" in the menu is the `listing_type=brand` filter. It is not a
  brand list.
- The `brand` URL filter is passed through to the server by the browse screen
  (`browse-screen.tsx`), but no control sets it.

### When it is a problem

Only if we want either of these:

- a **brand dropdown** in the product filter sidebar;
- a **clickable brand badge** on product detail or cards, opening that brand's
  products (this only needs the id, which the product row already has, so it
  does not need the list).

Without a list, buyers can still find a brand's products through the search box.

### What it does not break

Nothing. The `brand` filter works when its id is in the URL. There is just no
way in the UI to pick a brand.

### What the endpoint would give us

Suggested contract: `GET /public/catalog/brands/`, page-based, with `search`
and (optionally) `category` filters, returning `id, name, slug, logo_url`. It
should list only brands that have at least one visible product, so a buyer
never picks a brand that returns nothing. Once it exists, add a brand select to
the `Filters` component in `browse-screen.tsx`; the URL parameter and the
client call (`brand?: number` in `public-products-api.ts`) are already in place.

## Other open items

- **Register screen:** the "Sign Up" links point to `/register`, but no register
  form exists. The backend endpoint `POST /api/v1/auth/buyer/register/` is
  ready. Login and the route guard are built.
- **Empty cart body:** `GET /buyer/cart/` with no matching cart returns 200 with
  an empty body, not JSON `null` as the backend guide says. The client accepts
  both. The guide or the endpoint should be aligned.
- **Not yet built (buyer):** ordering and hiring, orders, messages,
  notifications, buyer projects and jobs, header search, banners and shop icons.
