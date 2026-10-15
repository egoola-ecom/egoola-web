import type { PaginatedResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type {
  ListingCore,
  ListingCreatorType,
  ListingInput,
  ListingListItem,
  ListingStatus,
} from "./listing-api";

// ---------------------------------------------------------------------------
// A seller's own listings: `/seller/listings/` (docs/seller-api-guide.md §6).
// Only a seller who can operate (verified AND active) may call it; anyone else
// gets 403 with a message that says which switch is holding them back.
//   - Always the seller's own, never anybody else's (404).
//   - A new listing is always `pending`. A seller never sends seller, buyer,
//     posted_by_role, status or requested_at.
//   - Create and update are JSON only (multipart is 415). The thumbnail and the
//     gallery have their own API (listing-files-api.ts) and never change the
//     status: only saving the listing itself resubmits it.
//   - Products only: a service offer is a gig (`/seller/gigs/`) and a service
//     sent here is a 400.
//   - Price and stock live on SKUs. Create may use the price shortcut OR
//     `skus`; an edit changes prices and stock only through `skus` with the
//     SKU `id` (a plain `price` / `stock_qty` on update is a 400).
//   - The status rule on a save: pending stays pending, approved stays
//     approved, rejected / changes_requested goes back to PENDING. There is no
//     Resubmit button: saving is resubmitting.
//   - No DELETE (405).
// ---------------------------------------------------------------------------

export interface SellerLookupCategory {
  id: number;
  type: "product" | "service";
  parent: number | null;
  name: string;
  name_bn: string | null;
  slug: string;
  sort_order: number;
}

export interface SellerLookupBrand {
  id: number;
  name: string;
  slug: string;
}

export interface SellerLookupMeasurement {
  id: number;
  name: string;
  slug: string;
  symbol: string;
}

export interface SellerLookupAttributeValue {
  id: number;
  name: string;
  name_bn: string | null;
}

export interface SellerLookupAttribute {
  id: number;
  name: string;
  name_bn: string | null;
  /** Active values only. */
  values: SellerLookupAttributeValue[];
}

/** A row of "My listings" — a light row with no owner fields. */
export type SellerListingRow = Omit<ListingListItem, "seller" | "buyer"> & {
  /** The admin's reason (rejected / changes requested), or the seller's own
   * message after a fix. */
  note: string | null;
  updated_at: string;
};

export interface SellerListingStatusLog {
  id: number;
  status: ListingStatus;
  note: string | null;
  /** `seller` or `admin` — never WHICH admin. */
  creator_type: ListingCreatorType;
  created_at: string;
}

/** The full listing the seller sees: no seller / buyer / posted_by_role and no
 * info change log (that is for admins). */
export interface SellerListingDetail extends ListingCore {
  status_change_logs: SellerListingStatusLog[];
}

/** What a seller may send. `note` is the "message to the reviewer" and only
 * counts when saving a rejected / changes-requested listing. */
export type SellerListingInput = Omit<
  ListingInput,
  "seller" | "buyer" | "posted_by_role" | "status" | "note" | "currency"
> & {
  note?: string | null;
  /** Create-time price shortcut (one default SKU). Never together with `skus`. */
  price?: string;
  discounted_price?: string | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  stock_qty?: number | null;
  sku?: string;
};

const LISTINGS_PATH = "/seller/listings/";
const LOOKUPS_PATH = "/seller/lookups/";

export function listSellerListings(params: URLSearchParams) {
  return authFetch<PaginatedResponse<SellerListingRow>>("seller", `${LISTINGS_PATH}?${params}`);
}

export function getSellerListing(id: number) {
  return authFetch<SellerListingDetail>("seller", `${LISTINGS_PATH}${id}/`);
}

export function createSellerListing(input: SellerListingInput) {
  return authFetch<SellerListingDetail>("seller", LISTINGS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSellerListing(id: number, input: Partial<SellerListingInput>) {
  return authFetch<SellerListingDetail>("seller", `${LISTINGS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Lookup lists are small: one call (limit up to 1000) fills a dropdown. This
 * follows `next` anyway, so a longer list is never cut off. */
async function listAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const query = new URLSearchParams({ limit: "1000", ...params });
  let page = await authFetch<PaginatedResponse<T>>("seller", `${LOOKUPS_PATH}${path}/?${query}`);
  const all = [...page.results];
  while (page.next) {
    page = await authFetch<PaginatedResponse<T>>("seller", page.next);
    all.push(...page.results);
  }
  return all;
}

/** Active categories of one type (a category must match the listing's
 * `catalog_type`). The list is flat; `parent` builds the tree. */
export function listSellerCategories(type: "product" | "service") {
  return listAll<SellerLookupCategory>("categories", { type });
}

export function listSellerBrands() {
  return listAll<SellerLookupBrand>("brands");
}

export function listSellerMeasurements() {
  return listAll<SellerLookupMeasurement>("measurements");
}

export function listSellerAttributes() {
  return listAll<SellerLookupAttribute>("attributes");
}
