import { authFetch } from "@/lib/auth";
import { toQuery } from "./public-fetch";
import type { GigPriceType, SellerRef } from "./types";

// Buyer cart (egoola-server docs/buyer-api-guide.md section 3). A buyer has one
// active cart per (type, seller), never a single cart, so every call names the
// type and the seller scope: a seller id, 0 for the shared cart of admin-owned
// listings, or "recent" for whichever cart of that type was touched last.

export type CartType = "product" | "service";
export type SellerScope = number | "recent";

export interface CartItem {
  id: number;
  listing: {
    id: number;
    title: string;
    title_bn: string | null;
    slug: string;
    image_url: string | null;
    catalog_type: CartType;
  };
  listing_sku: {
    id: number;
    sku: string | null;
    price: string;
    discounted_price: string;
    /** Set on a gig line: the unit `duration` is counted in. */
    price_type: GigPriceType | null;
    is_active: boolean;
  };
  /** A product line has `qty`, a gig line has `duration`. */
  qty: number | null;
  duration: number | null;
  color: string | null;
  size: string | null;
  unit_price: string | null;
  line_subtotal: string | null;
  /** false = stale (SKU off, listing no longer approved, or stock too low). */
  available: boolean;
  created_at: string;
}

export interface Cart {
  id: number;
  cart_type: CartType;
  /** null = the shared cart of admin-owned listings. */
  seller: SellerRef | null;
  is_active: boolean;
  items: CartItem[];
  subtotal: string;
  created_at: string;
  updated_at: string;
}

export interface AddToCartInput {
  listing: number;
  listing_sku: number;
  /** Product only. */
  qty?: number;
  /** Gig only. */
  duration?: number;
}

/** One row of the summary: a cart without its lines. */
export interface CartSummaryRow {
  id: number;
  cart_type: CartType;
  /** null = the shared cart of admin-owned listings. */
  seller: SellerRef | null;
  /** Number of lines, not a sum of qty or duration. */
  item_count: number;
  subtotal: string;
  updated_at: string;
}

export interface CartSummary {
  /** Lines across every cart. */
  item_count: number;
  /** Most recently touched first. */
  carts: CartSummaryRow[];
}

function cartQuery(type: CartType, seller: SellerScope): string {
  return toQuery({ type, seller: seller === "recent" ? undefined : seller });
}

/** `null` when the buyer has no such cart: show the empty state. The server
 * answers that case with a 200 and an empty body (the guide says JSON `null`),
 * so both read as "no cart". */
export async function getCart(type: CartType, seller: SellerScope): Promise<Cart | null> {
  const cart = await authFetch<Cart | null | undefined>("buyer", `/buyer/cart/${cartQuery(type, seller)}`);
  return cart ?? null;
}

/** Every active cart at once. Never creates one. */
export function getCartSummary() {
  return authFetch<CartSummary>("buyer", "/buyer/cart/summary/");
}

export function addCartItem(input: AddToCartInput) {
  return authFetch<CartItem>("buyer", "/buyer/cart/items/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Replaces the value (it does not add to it). Send `qty` on a product line,
 * `duration` on a gig line. */
export function updateCartItem(id: number, change: { qty: number } | { duration: number }) {
  return authFetch<CartItem>("buyer", `/buyer/cart/items/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
}

export function removeCartItem(id: number) {
  return authFetch<void>("buyer", `/buyer/cart/items/${id}/`, { method: "DELETE" });
}

/** Empties the cart; the cart itself stays. */
export function clearCart(type: CartType, seller: SellerScope) {
  return authFetch<void>("buyer", `/buyer/cart/${cartQuery(type, seller)}`, { method: "DELETE" });
}

/** The scope that names exactly this cart again. */
export function scopeOf(cart: Cart): number {
  return cart.seller?.id ?? 0;
}
