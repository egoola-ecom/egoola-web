# Buyer Web: public browsing, test record

Browser run (Chrome via playwright-core, no login) against the local backend
and its throwaway `egoola` DB. Cases follow the brief
(`egoola-server/docs/prompt/buyer/frontend-buyer-browsing-prompt.md` §4).
Test data added through the API only: Size/Colour attributes, a product with
4 variant SKUs (one sold out, one discounted), a wholesale product with two
quantity tiers, a sold-out product, a seller with business and contact info.

Routes: `/buyer/categories`, `/buyer/category/[id]?trail=`, `/buyer/products`,
`/buyer/products/[shop]`, `/buyer/product/[id]/[slug]`, `/buyer/services`,
`/buyer/service/[id]/[slug]`, `/buyer/seller/[id]`. Filters, sort and page
live in the URL.

| # | Case | Result |
|---|---|---|
| 1 | Categories, no params | Pass: top level only, arrows match `has_children` |
| 2 | Drill into a category, then a leaf | Pass: children + breadcrumb; a leaf goes to its listings; an opened leaf says so |
| 3 | Search at top vs inside a category | Pass: top searches every depth, inside only direct children; empty state is not "loading" |
| 4 | Product list, no filters | Pass: count equals the API (18); hidden listings absent |
| 5 | Parent category filter | Pass: includes every sub-category's products |
| 6 | price_min > price_max | Pass: the server's 400 message shows under the filters |
| 7 | in_stock=false, form Apply, sort | Pass |
| 8 | Product detail with variants | Pass: picker, per-combination price and stock, impossible combinations greyed out, wholesale tiers |
| 9 | Gig id on product route, and the reverse | Pass: "not found" page; non-numeric id is a 404 page |
| 10 | Gigs, price_type=hourly | Pass: only hourly, rate shown as "/ hour" |
| 11 | Seller page | Pass: business and contact hidden when null, shown (filled fields only) when set; list counts match |
| 12 | Pending or paused seller | Pass: "Seller not found" |
| 13 | Page past the last | Pass: "There are no more products/services/favourites to show" with a "Back to the first page" button (changed from a redirect on request) |
| 14 | Geography cascade | Pass: each level scoped to the parent; a level is loaded by walking `offset` until `next` is null (checked with the limit forced to 1: 2 calls, all rows); thanas send country, state and city |
| extra | Home page on live data | Pass |

Backend gaps found: no "get one category" call (breadcrumb names are found by
walking the lists, so a category opened by id alone has no ancestors), and no
public brand list (the `brand` filter works from the URL but has no dropdown).
