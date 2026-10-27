import type { CursorResponse } from "./accounts-api";
import { authFetch } from "./auth";

// ---------------------------------------------------------------------------
// Admin oversight of every buyer's cart. Read only, cursor paged.
// egoola-server/docs/cart-wishlist-admin-guide.md §1
//   GET /orders/carts/        GET /orders/carts/{id}/
// ---------------------------------------------------------------------------

const CARTS_PATH = "/orders/carts/";

export type CartType = "product" | "service";

/** The buyer block both screens show. */
export interface AdminBuyerSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_pic_url: string | null;
  wallet_balance: string;
  status: string;
}

export interface CartListItem {
  id: number;
  buyer: AdminBuyerSummary;
  cart_type: CartType;
  /** true = still open; false = closed, it became an order. */
  is_active: boolean;
  /** The linked order id, or null while the cart is open. */
  order: number | null;
  item_count: number;
  subtotal: string;
  created_at: string;
  updated_at: string;
}

export interface CartItemListing {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  image_url: string | null;
  catalog_type: CartType;
}

export interface CartItemSku {
  id: number;
  sku: string | null;
  price: string;
  discounted_price: string;
  price_type: string | null;
  is_active: boolean;
}

export interface AuditColumns {
  created_by: number | null;
  creator_type: string | null;
  creator_name: string | null;
  updated_by: number | null;
  updater_type: string | null;
  updater_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartLine extends AuditColumns {
  id: number;
  listing: CartItemListing;
  listing_sku: CartItemSku;
  qty: number | null;
  duration: number | null;
  color: string | null;
  size: string | null;
  unit_price: string;
  line_subtotal: string;
  /** false: the SKU went inactive, the listing is not approved any more, or
   * stock cannot cover `qty`. The line is flagged, never removed. */
  available: boolean;
}

export interface CartDetail extends CartListItem, AuditColumns {
  items: CartLine[];
}

export type CartOrdering =
  | "created_at"
  | "-created_at"
  | "updated_at"
  | "-updated_at"
  | "id"
  | "-id";

/** Pass the filters for the first page, or a `next` link (full URL) to
 * continue; a link already carries every filter. */
export function listCarts(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${CARTS_PATH}?${target}`;
  return authFetch<CursorResponse<CartListItem>>("admin", path);
}

export function getCart(id: number) {
  return authFetch<CartDetail>("admin", `${CARTS_PATH}${id}/`);
}
