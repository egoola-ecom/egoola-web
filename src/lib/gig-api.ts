import { authFetch } from "./auth";
import { CursorResponse, PaginatedResponse } from "./accounts-api";
import type {
  ListingBulkResult,
  ListingBulkStatus,
  ListingInfoChangeLog,
  ListingMediaItem,
  ListingPostedByRole,
  ListingStatus,
  ListingStatusChangeLog,
  ListingStatusInput,
} from "./listing-api";

// ---------------------------------------------------------------------------
// Gig — a seller's SERVICE OFFER (catalog_type "service" + posted_by_role
// "seller_offer"), on its own admin API `/catalog/gigs/`. Same table as the
// listings, a different kind: a product id here is a 404 and a gig id on
// `/catalog/listings/` is a 404. Admin-only (docs/listing-complete-guide.md
// §14, §15). Key behaviours the UI relies on:
//   - A gig is priced by PACKAGES: a SKU with a `price_type` (hourly, daily,
//     weekly, monthly or fixed) and a `price` that is the RATE for that unit.
//     A package has no duration (the buyer picks it when ordering), no stock
//     and no options. At most ONE package per price type — a hidden package
//     still holds its price type.
//   - On create send the full `skus` list (JSON — multipart cannot carry it).
//     On PATCH `skus` merges by `id`: an item with an `id` changes only the
//     fields sent, one without adds a package, packages left out stay.
//     Packages are never deleted: hide with `{id, is_active: false}`.
//   - A plain `price` / `stock_qty` on update is a 400 (prices change only
//     through `skus`). The gig's own `price` / `discounted_price` are read
//     only: the LOWEST rate among the active packages (null when none).
//   - `catalog_type` and `posted_by_role` are set by the endpoint.
//   - A gig has no brand, model, origin, warranty, measurement, condition,
//     listing_type, attributes, min_order_qty or price tiers (400).
//   - Status changes go through the same PATCH; `note` is required for
//     rejected / changes_requested. The thumbnail (`image_path` / `image_url`)
//     and the gallery are read only here (listing-files-api.ts changes them).
//   - Delete is a soft delete (204).
// ---------------------------------------------------------------------------

export type GigPriceType = "hourly" | "daily" | "weekly" | "monthly" | "fixed";

export interface GigListItem {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  category: number;
  seller: number | null;
  /** The LOWEST rate among the active packages; null when none is active. */
  price: string | null;
  discounted_price: string | null;
  /** What that lowest rate is for ("৳450 / hour"); `fixed` is a flat price. */
  price_type: GigPriceType | null;
  /** The thumbnail (a `/media/...` path, resolve it); null when none. */
  image_url: string | null;
  status: ListingStatus;
  requested_at: string | null;
  created_at: string;
}

/** One package. A gig SKU has no stock (`stock_qty` is always null), no
 * options (`variants` is always empty) and no duration. */
export interface GigSku {
  id: number;
  /** Optional code, unique across all SKUs. */
  sku: string | null;
  price_type: GigPriceType;
  /** The rate for that price type (a string, never a number). */
  price: string;
  /** Always present; equals `price` when there is no discount. */
  discounted_price: string;
  discount_start_date: string | null;
  discount_end_date: string | null;
  /** The rate right now (read only). */
  effective_price: string;
  is_discount_active: boolean;
  description: string | null;
  description_bn: string | null;
  stock_qty: null;
  reserved_qty: number;
  is_active: boolean;
  variants: never[];
}

/** One item of `skus` on a write. With `id` it changes only the fields sent;
 * without `id` it adds a package (which needs `price` and `price_type`). */
export interface GigSkuInput {
  id?: number;
  sku?: string | null;
  price_type?: GigPriceType;
  price?: string;
  discounted_price?: string | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  description?: string | null;
  description_bn?: string | null;
  is_active?: boolean;
}

export interface GigDetail {
  id: number;
  seller: number | null;
  category: number;
  catalog_type: "service";
  posted_by_role: ListingPostedByRole | null;
  title: string;
  title_bn: string | null;
  slug: string;
  description: string;
  description_bn: string | null;
  image_path: string | null;
  image_url: string | null;
  /** The lowest rate among the active packages; null when none is active. */
  price: string | null;
  discounted_price: string | null;
  currency: string;
  skus: GigSku[];
  delivery_days: number | null;
  urgent: boolean | null;
  package_includes: string | null;
  package_includes_bn: string | null;
  available_from: string | null;
  available_to: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  status: ListingStatus;
  /** The reason of the CURRENT status (rejected / changes requested). */
  note: string | null;
  requested_at: string | null;
  media: ListingMediaItem[];
  status_change_logs: ListingStatusChangeLog[];
  info_change_logs: ListingInfoChangeLog[];
  created_at: string;
  updated_at: string;
}

/** JSON write payload. Create needs category / title / description and at
 * least one package in `skus`; on PATCH every key is optional (a key left out
 * is left untouched). */
export interface GigInput {
  category: number;
  title: string;
  title_bn?: string | null;
  description: string;
  description_bn?: string | null;
  /** The owner (admin only); a gig with no seller is allowed. */
  seller?: number | null;
  currency?: string;
  skus?: GigSkuInput[];
  delivery_days?: number | null;
  urgent?: boolean | null;
  package_includes?: string | null;
  package_includes_bn?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  /** Create only; moderate later through `updateGigStatus`. */
  status?: ListingStatus;
  note?: string | null;
}

const GIGS_PATH = "/catalog/gigs/";

/** Filters: status, category, seller, price_type (gigs with an ACTIVE package
 * priced that way), created_from / created_to, requested_from / requested_to,
 * search (title, Bangla title, SKU code), limit / offset. */
export function listGigs(params: URLSearchParams) {
  return authFetch<PaginatedResponse<GigListItem>>("admin", `${GIGS_PATH}?${params}`);
}

/** The pending gig list: only `status=pending`, CURSOR-paged (no `count`).
 * Pass the filters for the first page, or the server's own `next` link (full
 * URL) to continue. `ordering`: `-requested_at` (default), `requested_at`,
 * `created_at`, `title`, `id`. */
export function listGigRequests(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${GIGS_PATH}requests/?${target}`;
  return authFetch<CursorResponse<GigListItem>>("admin", path);
}

/** How many gigs wait for a decision — the menu badge. */
export async function countPendingGigs(): Promise<number> {
  const params = new URLSearchParams({ status: "pending", limit: "1" });
  const res = await listGigs(params);
  return res.count;
}

export function getGig(id: number) {
  return authFetch<GigDetail>("admin", `${GIGS_PATH}${id}/`);
}

export function createGig(input: GigInput) {
  return authFetch<GigDetail>("admin", GIGS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGig(id: number, input: Partial<GigInput>) {
  return authFetch<GigDetail>("admin", `${GIGS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Moderation — the same PATCH as any other edit, carrying only status + note. */
export function updateGigStatus(id: number, input: ListingStatusInput) {
  return updateGig(id, input);
}

export function deleteGig(id: number) {
  return authFetch<void>("admin", `${GIGS_PATH}${id}/`, { method: "DELETE" });
}

export function bulkModerateGigs(input: {
  listing_ids: number[];
  status: ListingBulkStatus;
  note?: string;
}) {
  return authFetch<ListingBulkResult>("admin", `${GIGS_PATH}bulk-moderate/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
