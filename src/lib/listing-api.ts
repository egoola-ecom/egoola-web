import { authFetch } from "./auth";
import { CursorResponse, PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// Listing — one table for every listing format (general/used/village/retail/
// wholesale/brand) and for services (docs/listing-module-guide.md §5).
// Admin-only. Key behaviours the UI relies on:
//   - Price, discount and stock live on SKUs (`skus`), not on the listing
//     (docs/attribute-sku-guide.md). The listing's own `price` /
//     `discounted_price` are read-only "from" prices — the cheapest active SKU,
//     null when no SKU is active — meant for list rows only.
//   - SKUs are never deleted: `skus` on PATCH merges by `id` (only the fields
//     sent change), an item without `id` adds a SKU, SKUs left out stay as
//     they are, and a SKU is hidden with `is_active: false`.
//   - `brand` is a Brand id (mandatory when `listing_type` is "brand").
//   - Status changes go through the same PATCH; `note` is required for
//     rejected / changes_requested. Every change writes one append-only row to
//     `status_change_logs` (newest first on the detail response only).
//   - `price_tiers`, when sent, replaces the whole tier list.
//   - Media is multipart (`media_file`, `media_delete_ids`); nested values
//     like price_tiers don't go through multipart, so media is saved in its
//     own request after the JSON save.
//   - Delete is a soft delete (204).
//   - Six texts have an optional Bangla twin (title_bn, description_bn,
//     package_includes_bn, condition_note_bn, warranty_bn, origin_bn).
//   - `requested_at` is when the listing joined the pending list (a seller
//     created it, or fixed it after a rejection); null for admin-made ones.
//   - `info_change_logs` (detail only, admin only): one row per save that
//     really changed content, by a seller OR an admin, before and after.
//     Stock is never recorded.
// ---------------------------------------------------------------------------

export type ListingCatalogType = "product" | "service";
export type ListingType = "general" | "used" | "village" | "retail" | "wholesale" | "brand";
export type ListingPostedByRole = "seller_offer" | "buyer_request";
export type ListingPriceType = "fixed" | "hourly";
export type ListingStatus = "draft" | "pending" | "approved" | "rejected" | "changes_requested";
export type ListingCreatorType = "admin" | "seller" | "user" | "system";
export type ListingMediaType = "image" | "video" | "document";

export interface ListingListItem {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  catalog_type: ListingCatalogType;
  listing_type: ListingType | null;
  category: number;
  brand: number | null;
  seller: number | null;
  buyer: number | null;
  /** "From" price — cheapest active SKU; null when no SKU is active. */
  price: string | null;
  discounted_price: string | null;
  status: ListingStatus;
  /** When the listing joined the pending list; null for admin-made ones. */
  requested_at: string | null;
  created_at: string;
}

export interface ListingPriceTier {
  id: number;
  min_qty: number;
  max_qty: number | null;
  price: string;
  discounted_price: string;
  /** Id of one of this listing's SKUs, or null for a listing-wide tier. */
  listing_sku?: number | null;
}

export interface ListingSkuVariant {
  attribute: number;
  attribute_name: string;
  attribute_value: number;
  attribute_value_name: string;
}

export interface ListingSku {
  id: number;
  /** Optional product code, unique across all SKUs. */
  sku: string | null;
  price: string;
  /** Always present; equals `price` when there is no discount. */
  discounted_price: string;
  discount_start_date: string | null;
  discount_end_date: string | null;
  /** What a buyer pays right now (read only). */
  effective_price: string;
  is_discount_active: boolean;
  /** null = stock is not tracked (services). */
  stock_qty: number | null;
  reserved_qty: number;
  is_active: boolean;
  variants: ListingSkuVariant[];
}

export interface ListingSkuVariantInput {
  attribute: number;
  attribute_value: number;
}

/** One item of `skus` on a write. With `id` it changes only the fields sent;
 * without `id` it adds a SKU (which needs `price`). */
export interface ListingSkuInput {
  id?: number;
  sku?: string;
  price?: string;
  discounted_price?: string | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  stock_qty?: number | null;
  is_active?: boolean;
  variants?: ListingSkuVariantInput[];
}

export interface ListingMediaItem {
  id: number;
  media_type: ListingMediaType;
  media_path: string;
  media_url: string;
}

export interface ListingStatusChangeLog {
  id: number;
  status: ListingStatus;
  note: string | null;
  created_by: number | null;
  creator_type: ListingCreatorType;
  creator_name: string;
  created_at: string;
}

/** Everything the admin and the seller detail answers share. */
export interface ListingCore {
  id: number;
  category: number;
  catalog_type: ListingCatalogType;
  listing_type: ListingType | null;
  title: string;
  title_bn: string | null;
  slug: string;
  description: string;
  description_bn: string | null;
  brand: number | null;
  brand_name: string | null;
  model: string | null;
  origin: string | null;
  origin_bn: string | null;
  warranty: string | null;
  warranty_bn: string | null;
  /** "From" price — cheapest active SKU; null when no SKU is active. */
  price: string | null;
  discounted_price: string | null;
  currency: string;
  skus: ListingSku[];
  price_type: ListingPriceType | null;
  hourly_rate: string | null;
  delivery_days: number | null;
  urgent: boolean | null;
  package_includes: string | null;
  package_includes_bn: string | null;
  available_from: string | null;
  available_to: string | null;
  min_order_qty: number | null;
  measurement: number | null;
  condition_note: string | null;
  condition_note_bn: string | null;
  attributes: unknown;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  status: ListingStatus;
  /** Belongs to the CURRENT status: the admin's reason when rejected / changes
   * requested; the seller's own message after a seller fixed it. */
  note: string | null;
  requested_at: string | null;
  price_tiers: ListingPriceTier[];
  media: ListingMediaItem[];
  created_at: string;
  updated_at: string;
}

/** One save that really changed the content (admin only). `previous_data` and
 * `new_data` carry the same keys — exactly `changed_fields`. Places, brand and
 * measurement are `{id, name}` or null; `price_tiers`, `skus` and `media` are
 * whole lists before and after. */
export interface ListingInfoChangeLog {
  id: number;
  changed_fields: string[];
  previous_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  created_by: number | null;
  creator_type: ListingCreatorType;
  creator_name: string;
  created_at: string;
}

/** What the listing form needs to start from: the shared detail fields. The
 * owner fields only exist on the admin's detail. */
export type ListingFormInitial = ListingCore & {
  seller?: number | null;
  buyer?: number | null;
  posted_by_role?: ListingPostedByRole | null;
};

export interface ListingDetail extends ListingCore {
  seller: number | null;
  buyer: number | null;
  posted_by_role: ListingPostedByRole | null;
  status_change_logs: ListingStatusChangeLog[];
  info_change_logs: ListingInfoChangeLog[];
}

export interface ListingPriceTierInput {
  min_qty: number;
  max_qty: number | null;
  price: string;
  discounted_price: string | null;
  /** One of this listing's SKU ids; only valid on update. */
  listing_sku?: number | null;
}

/** JSON write payload. Create needs category / catalog_type / title /
 * description / `skus` (at least one); everything else is optional, and on
 * PATCH every key is optional (a key that is left out is left untouched on the
 * server). Price, discount and stock go through `skus` only — a plain `price`
 * or `stock_qty` on update is a 400. */
export interface ListingInput {
  seller?: number | null;
  buyer?: number | null;
  category: number;
  catalog_type: ListingCatalogType;
  listing_type?: ListingType | null;
  posted_by_role?: ListingPostedByRole | null;
  title: string;
  title_bn?: string | null;
  description: string;
  description_bn?: string | null;
  brand?: number | null;
  model?: string | null;
  origin?: string | null;
  origin_bn?: string | null;
  warranty?: string | null;
  warranty_bn?: string | null;
  skus?: ListingSkuInput[];
  currency?: string;
  price_type?: ListingPriceType | null;
  hourly_rate?: string | null;
  delivery_days?: number | null;
  urgent?: boolean | null;
  package_includes?: string | null;
  package_includes_bn?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  min_order_qty?: number | null;
  measurement?: number | null;
  condition_note?: string | null;
  condition_note_bn?: string | null;
  attributes?: unknown;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  status?: ListingStatus;
  note?: string | null;
  price_tiers?: ListingPriceTierInput[];
}

export interface ListingStatusInput {
  status: ListingStatus;
  note?: string;
}

/** Statuses the bulk endpoint accepts (draft / pending can only be set on a
 * single listing). */
export type ListingBulkStatus = "approved" | "rejected" | "changes_requested";

export interface ListingBulkResult {
  updated: number[];
  skipped: number[];
}

const LISTINGS_PATH = "/catalog/listings/";

export function listListings(params: URLSearchParams) {
  return authFetch<PaginatedResponse<ListingListItem>>("admin", `${LISTINGS_PATH}?${params}`);
}

/** The admin's pending list: only `status=pending`, CURSOR-paged (no `count`).
 * Pass the filters for the first page, or the server's own `next` link (full
 * URL) to continue — a link already carries every filter. `ordering` is one of
 * `-requested_at` (default, newest request first), `requested_at`,
 * `created_at`, `title`, `id`. */
export function listListingRequests(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${LISTINGS_PATH}requests/?${target}`;
  return authFetch<CursorResponse<ListingListItem>>("admin", path);
}

/** How many listings wait for a decision — the menu badge. The queue has no
 * count, so the normal list is asked with the same status. */
export async function countPendingListings(): Promise<number> {
  const params = new URLSearchParams({ status: "pending", limit: "1" });
  const res = await listListings(params);
  return res.count;
}

export function getListing(id: number) {
  return authFetch<ListingDetail>("admin", `${LISTINGS_PATH}${id}/`);
}

export function createListing(input: ListingInput) {
  return authFetch<ListingDetail>("admin", LISTINGS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateListing(id: number, input: Partial<ListingInput>) {
  return authFetch<ListingDetail>("admin", `${LISTINGS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Moderation — same PATCH as any other edit, carrying only status + note. */
export function updateListingStatus(id: number, input: ListingStatusInput) {
  return updateListing(id, input);
}

/** Adds and/or removes gallery media in one multipart PATCH. Kept apart from
 * the JSON save because nested values (price_tiers) don't survive multipart. */
export function syncListingMedia(id: number, files: File[], deleteIds: number[]) {
  const formData = new FormData();
  for (const file of files) formData.append("media_file", file);
  for (const mediaId of deleteIds) formData.append("media_delete_ids", String(mediaId));
  return authFetch<ListingDetail>("admin", `${LISTINGS_PATH}${id}/`, {
    method: "PATCH",
    body: formData,
  });
}

export function deleteListing(id: number) {
  return authFetch<void>("admin", `${LISTINGS_PATH}${id}/`, { method: "DELETE" });
}

export function bulkModerateListings(input: {
  listing_ids: number[];
  status: ListingBulkStatus;
  note?: string;
}) {
  return authFetch<ListingBulkResult>("admin", `${LISTINGS_PATH}bulk-moderate/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
