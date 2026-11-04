import { ApiError, apiFetch } from "@/lib/api";
import { authFetch } from "@/lib/auth";
import { toQuery } from "./public-fetch";
import type { PageResult } from "./types";
import { ENDPOINTS } from "../endpoints";

// Buyer orders (egoola-server docs/buyer-order-api-guide.md). Checkout turns one
// active cart into an order, its lines and its payment in a single call. The
// list is page-based. A buyer can only move an order to "cancelled", and only
// before the seller ships it. Another buyer's order is a 404, never a 403.

export type OrderStatus = "pending" | "accepted" | "rejected" | "in_progress" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "due" | "initiated" | "paid" | "failed" | "cancelled" | "partially_paid";

export interface OrderSeller {
  id: number;
  name: string;
  phone: string | null;
  profile_pic_url: string | null;
}

export interface OrderRow {
  id: number;
  order_type: string;
  seller: OrderSeller | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: string;
  delivery_cost: string;
  discount: string;
  total: string;
  payable: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  listing: number;
  listing_sku: number;
  title_snapshot: string;
  price_snapshot: string;
  price_type_snapshot: string | null;
  qty: number | null;
  duration: number | null;
  total: string;
  subtotal: string;
}

export interface OrderAddress {
  name: string;
  phone: string;
  country: number;
  state: number;
  city: number;
  thana: number;
  country_name: string | null;
  state_name: string | null;
  city_name: string | null;
  thana_name: string | null;
  address_line1: string;
  address_line2: string | null;
  zip: string | null;
}

export interface StatusHistory<S extends string> {
  id: number;
  previous_status: S | null;
  current_status: S;
  reason?: string | null;
  creator_type: string | null;
  creator_name: string | null;
  created_at: string;
}

export interface OrderPayment {
  id: number;
  status: PaymentStatus;
  amount: string;
  method: string;
  gateway_slug: string | null;
  status_histories: StatusHistory<PaymentStatus>[];
}

export interface Order extends OrderRow {
  items: OrderItem[];
  address: OrderAddress | null;
  payment: OrderPayment | null;
  status_histories: StatusHistory<OrderStatus>[];
  cancelled_reason: string | null;
  rejected_reason: string | null;
}

export interface CheckoutInput {
  cart: number;
  address: number;
  payment_gateway: number;
}

const ORDERS = ENDPOINTS.buyer.orders;

export const checkout = (input: CheckoutInput) =>
  authFetch<Order>("buyer", ORDERS.list, { method: "POST", body: JSON.stringify(input) });

export const listOrders = (params: { status?: string; page?: number; page_size?: number } = {}) =>
  authFetch<PageResult<OrderRow>>("buyer", `${ORDERS.list}${toQuery(params)}`);

export const getOrder = (id: number) => authFetch<Order>("buyer", ORDERS.detail(id));

export const cancelOrder = (id: number, reason?: string) =>
  authFetch<Order>("buyer", ORDERS.detail(id), {
    method: "PATCH",
    body: JSON.stringify(reason?.trim() ? { status: "cancelled", reason: reason.trim() } : { status: "cancelled" }),
  });

/** A buyer may cancel until the seller ships. */
export const canCancel = (status: OrderStatus) => status === "pending" || status === "accepted" || status === "in_progress";

export interface PublicGateway {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
}

/** Active gateways, no login, no paging. Never hardcode an id: it is whatever
 * the database assigned. */
export const listPublicGateways = () => apiFetch<PublicGateway[]>(ENDPOINTS.public.paymentGateways);

export interface OrderProblem {
  fields: Record<string, string>;
  general: string | null;
}

const text = (value: unknown) =>
  Array.isArray(value) ? value.map(String).join(" ") : typeof value === "string" ? value : "";

/** The server answers a cart or address it cannot find (not yours, or a cart
 * that was already checked out and closed) with a raw `Invalid pk "318" -
 * object does not exist.` Say what it means. */
function friendly(field: string, message: string): string {
  if (!/invalid pk|does not exist/i.test(message)) return message;
  if (field === "cart") return "This cart was already checked out, or it no longer exists. Check My orders.";
  if (field === "address") return "That address is no longer available. Choose another one.";
  if (field === "payment_gateway") return "That payment method is not available. Reload and try again.";
  return message;
}

/** Reads a failed order call into messages for the screen. */
export function orderProblem(err: unknown): OrderProblem {
  if (err instanceof ApiError) {
    if (err.status === 404) return { fields: {}, general: "We couldn't find that order." };
    if (err.status === 400 && err.body && typeof err.body === "object") {
      const fields: Record<string, string> = {};
      let general: string | null = null;
      for (const [key, value] of Object.entries(err.body as Record<string, unknown>)) {
        const message = text(value);
        if (!message) continue;
        if (key === "detail" || key === "non_field_errors") general = message;
        else fields[key] = friendly(key, message);
      }
      if (general || Object.keys(fields).length) return { fields, general };
    }
  }
  return { fields: {}, general: "Something went wrong. Please try again." };
}
