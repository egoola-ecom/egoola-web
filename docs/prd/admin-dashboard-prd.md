# PRD: Admin Dashboard API

| | |
|---|---|
| **Owner** | Egoola Web (frontend) |
| **For** | Egoola Server (backend) |
| **Status** | Built by backend and used by the frontend (see `docs/admin-dashboard-tests.md`) |
| **Area** | Admin panel, Dashboard page (`/admin/dashboard`) |
| **Related code** | `src/app/(admin)/admin/(protected)/dashboard/dashboard-client.tsx` |

## 1. Summary

The admin dashboard needs one backend endpoint that returns every dashboard number in a single response. Today the page has no dashboard API. It makes 12 separate list calls and reads only the `count` from each. We want one call that does the counting on the server.

## 2. Background and problem

The dashboard was built as an interim screen because the backend had no dashboard API. The page calls existing list endpoints with `?limit=1` and uses only the `count` field.

Problems with this:

1. **Cost.** Every page load makes 12 requests, and each one makes the database count a whole table. The cost grows with the data and with the number of admins.
2. **Wasted data.** Each call returns one row that the page never uses.
3. **Limited.** The page can only show what a list filter can count. It cannot show orders, revenue, carts or trends.
4. **Fragile.** If a list's filter or permission changes, a tile breaks silently.
5. **Not one snapshot.** The 12 numbers are read at slightly different moments.

## 3. Goals

- One request gives the page everything it needs to draw.
- Numbers are computed on the server and match the existing lists exactly.
- The page gains order and marketplace figures now that orders exist.
- The response can grow later without breaking the page.

## 4. Non-goals

- Charts and time series (listed as a later phase in section 10).
- Per-admin or per-seller dashboards.
- Exports and reports.
- Changing any existing list endpoint.

## 5. Users

| User | Needs |
|---|---|
| Admin | To see at a glance what needs attention and how big the platform is |
| Super-admin | The same, plus the number of admins |

Sellers and buyers never use this endpoint.

## 6. What the page shows today

These are the 12 numbers on the page now, and the existing list call behind each. The new endpoint must replace all of them.

**Needs attention**

| Tile | Existing call | Count today |
|---|---|---|
| Sellers waiting for verification review | `GET /accounts/sellers/?verification_status=pending` | 1 |
| Sellers not yet verified | `GET /accounts/sellers/?verification_status=unverified` | 2 |
| Product listings waiting for moderation | `GET /catalog/listings/?status=pending` | 5 |
| Product listings with changes requested | `GET /catalog/listings/?status=changes_requested` | 2 |
| Gigs waiting for moderation | `GET /catalog/gigs/?status=pending` | 2 |
| Gigs with changes requested | `GET /catalog/gigs/?status=changes_requested` | 0 |

**Platform totals**

| Tile | Existing call | Count today |
|---|---|---|
| Buyers | `GET /accounts/buyers/` | 108 |
| Sellers | `GET /accounts/sellers/` | 57 |
| Product listings | `GET /catalog/listings/` | 72 |
| Gigs | `GET /catalog/gigs/` | 13 |
| Banners live now | `GET /cms/banners/?active_now=true` | 0 |
| Admins (super-admin only) | `GET /accounts/admins/` | not available to a plain admin (403) |

## 7. Requirements

### 7.1 The endpoint

`GET /api/v1/dashboard/summary/`

| | |
|---|---|
| **Method** | `GET` only |
| **Auth** | Admin Bearer token |
| **No token** | `401` |
| **Seller or buyer token** | `403` |
| **Pagination** | None. One JSON object |
| **Query parameters** | None in the first version |

### 7.2 Permissions

- Any admin can call it.
- The `totals.admins` figure is returned only to a super-admin. For a plain admin it is `null`. The call still succeeds with `200`.

### 7.3 Response

```json
{
  "generated_at": "2026-11-04T10:30:00+06:00",

  "needs_attention": {
    "sellers_pending_review": 1,
    "sellers_unverified": 2,
    "listings_pending": 5,
    "listings_changes_requested": 2,
    "gigs_pending": 2,
    "gigs_changes_requested": 0,
    "orders_pending": 0,
    "orders_disputed": 0
  },

  "totals": {
    "buyers": 108,
    "sellers": 57,
    "listings": 72,
    "gigs": 13,
    "banners_live": 0,
    "admins": null
  },

  "orders": {
    "today": 0,
    "this_month": 0,
    "by_status": {
      "pending": 0,
      "accepted": 0,
      "in_progress": 0,
      "shipped": 0,
      "delivered": 0,
      "rejected": 0,
      "cancelled": 0,
      "completed": 0,
      "disputed": 0
    },
    "revenue": {
      "currency": "BDT",
      "paid_this_month": "0.00",
      "due_outstanding": "0.00"
    }
  },

  "marketplace": {
    "open_carts": 0,
    "jobs_open_for_bidding": 0,
    "bids_pending": 0
  }
}
```

### 7.4 Field definitions

Fields marked **existing** must equal the `count` of the existing list call for the same filter, so that a tile and the list it links to always agree.

| Field | Definition | Source |
|---|---|---|
| `generated_at` | When the numbers were computed, ISO 8601 with the Asia/Dhaka offset | new |
| `needs_attention.sellers_pending_review` | Sellers with `verification_status = pending` | existing |
| `needs_attention.sellers_unverified` | Sellers with `verification_status = unverified` | existing |
| `needs_attention.listings_pending` | Product listings with `status = pending` | existing |
| `needs_attention.listings_changes_requested` | Product listings with `status = changes_requested` | existing |
| `needs_attention.gigs_pending` | Gigs with `status = pending` | existing |
| `needs_attention.gigs_changes_requested` | Gigs with `status = changes_requested` | existing |
| `needs_attention.orders_pending` | Orders with status `pending` | new |
| `needs_attention.orders_disputed` | Orders with status `disputed` | new |
| `totals.buyers` | All buyers | existing |
| `totals.sellers` | All sellers | existing |
| `totals.listings` | All product listings | existing |
| `totals.gigs` | All gigs | existing |
| `totals.banners_live` | Banners that are live now (`active_now = true`) | existing |
| `totals.admins` | All admins. `null` for a plain admin | existing |
| `orders.today` | Orders created today | new |
| `orders.this_month` | Orders created this calendar month | new |
| `orders.by_status` | A count for each of the 9 order statuses | new |
| `orders.revenue.currency` | Always `"BDT"` for now | new |
| `orders.revenue.paid_this_month` | Sum of `payable` of orders whose payment became `paid` this calendar month | new |
| `orders.revenue.due_outstanding` | Sum of `payable` of orders whose payment is still `due`, leaving out orders that are `cancelled` or `rejected` | new |
| `marketplace.open_carts` | Carts that are still active (open) | new |
| `marketplace.jobs_open_for_bidding` | Jobs with status `open_for_bidding` | new |
| `marketplace.bids_pending` | Bids with status `pending` | new |

### 7.5 Rules

1. **Every key is always present.** A count with nothing to count is `0`, never missing. Every one of the 9 statuses appears in `orders.by_status`.
2. **Money is a string with two decimals** (for example `"1450.00"`), as everywhere else in the API.
3. **Time zone.** "Today" and "this month" use Asia/Dhaka.
4. **Counts match the lists.** A figure marked existing includes exactly what the matching list includes, and leaves out exactly what it leaves out.
5. **No partial answers.** If one figure cannot be computed, the whole call fails with a `5xx`. The page then shows "couldn't load".
6. **Compatible growth.** New keys may be added later. The page ignores keys it does not know.
7. **One snapshot.** Ideally all numbers come from one consistent read. If not possible, it is acceptable if they differ by a moment.

### 7.6 Non-functional

| | |
|---|---|
| **Speed** | Under 1 second for the current data size, and it should stay fast as data grows |
| **Cache** | A server-side cache of 30 to 60 seconds is acceptable. `generated_at` tells the page how fresh it is |
| **Load** | A few admins open it at once. It must not slow other endpoints |
| **Queries** | Use aggregate counts, and do not load rows |

## 8. Errors

| Case | Response |
|---|---|
| No token or an expired token | `401` |
| A seller or buyer token | `403` |
| A plain admin | `200`, with `totals.admins` set to `null` |
| Any failure while computing | `5xx` with `{"detail": "..."}` |

## 9. Acceptance criteria

1. `GET /dashboard/summary/` with an admin token returns `200` and the object in section 7.3, with every key present.
2. With no token it returns `401`. With a seller token it returns `403`. With a buyer token it returns `403`.
3. With a plain admin token, `totals.admins` is `null`. With a super-admin token, it is a number equal to the admins list `count`.
4. For each field marked existing, the value equals the `count` of the matching list call at the same moment.
5. `orders.by_status` has all 9 keys. The sum of its values equals the count of all orders in the list.
6. `orders.today` and `orders.this_month` use the Asia/Dhaka calendar, tested around midnight.
7. `revenue.paid_this_month` counts a payment that turned `paid` this month, including when the order was delivered in the same month.
8. `revenue.due_outstanding` leaves out `cancelled` and `rejected` orders.
9. With an empty database, every count is `0` and every amount is `"0.00"`.
10. The call is well under 1 second on the current data.

## 10. Later phase (not part of the first version)

A trend endpoint for charts.

`GET /api/v1/dashboard/trend/?metric=orders|revenue&from=YYYY-MM-DD&to=YYYY-MM-DD&interval=day|week|month`

```json
{
  "metric": "orders",
  "interval": "day",
  "points": [
    { "date": "2026-11-01", "value": 3 },
    { "date": "2026-11-02", "value": 5 }
  ]
}
```

Every date in the range is present, with `0` for an empty day. Same auth and permission rules as the summary.

## 11. Frontend plan

When the endpoint is ready:

1. Replace the 12 list calls in `dashboard-client.tsx` with one call to `/dashboard/summary/`.
2. Keep the existing tiles and their links.
3. Add tiles for the order and marketplace figures.
4. Remove the "interim dashboard" note from the page.

The frontend does not need anything else from the backend.

## 12. Open questions

| # | Question | Default if not answered |
|---|---|---|
| 1 | Do we want revenue figures, or counts only? | Include revenue |
| 2 | Should "this month" be the calendar month or the last 30 days? | Calendar month |
| 3 | Should revenue use the order's `payable` or the payment's `amount`? | `payable` |
| 4 | Is a cache needed, and for how long? | 30 to 60 seconds |
| 5 | Should the endpoint also be available to roles other than admin later? | No |
