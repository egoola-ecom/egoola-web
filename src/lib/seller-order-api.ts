import type { CursorResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type {
  OrderAddress,
  OrderItem,
  OrderPayment,
  OrderSeller,
  OrderStatus,
  PaymentStatus,
  StatusHistory,
} from "./buyer/buyer-orders-api";
import { ENDPOINTS } from "./endpoints";

// ---------------------------------------------------------------------------
// The orders placed with this seller (egoola-server docs/seller/
// seller-order-api-guide.md). Needs a seller who can operate (verified AND
// active), otherwise 403. The list is CURSOR paged ({next, previous, results},
// no `count`). Only product orders appear.
//   GET   /seller/orders/        ?status= ?created_from= ?created_to= ?search=
//   GET   /seller/orders/{id}/
//   PATCH /seller/orders/{id}/   move it forward, one step at a time
// A move answers with the full order, never just the fields sent. An order
// placed with another seller is a 404.
// ---------------------------------------------------------------------------

export type SellerOrderStatus = OrderStatus | "disputed" | "completed";

export interface SellerOrderBuyer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  profile_pic_url: string | null;
  wallet_balance: string;
  status: string;
}

export interface SellerOrderRow {
  id: number;
  order_type: string;
  buyer: SellerOrderBuyer | null;
  status: SellerOrderStatus;
  payment_status: PaymentStatus;
  subtotal: string;
  delivery_cost: string;
  discount: string;
  total: string;
  payable: string;
  created_at: string;
  updated_at: string;
}

export interface SellerOrder extends SellerOrderRow {
  /** Present on the buyer's copy; a seller's detail may leave it out. */
  seller?: OrderSeller | null;
  items: OrderItem[];
  address: OrderAddress | null;
  payment: OrderPayment | null;
  status_histories: StatusHistory<SellerOrderStatus>[];
  expected_delivery_at: string | null;
  completed_at: string | null;
  cancelled_reason: string | null;
  rejected_reason: string | null;
}

const ORDERS = ENDPOINTS.seller.orders;

/** Pass the filters for the first page, or the server's `next` link to go on. */
export function listSellerOrders(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${ORDERS.list}?${target}`;
  return authFetch<CursorResponse<SellerOrderRow>>("seller", path);
}

export const getSellerOrder = (id: number) => authFetch<SellerOrder>("seller", ORDERS.detail(id));

/** `reason` is required by the server for `rejected`, and ignored otherwise. */
export function moveSellerOrder(id: number, status: SellerOrderStatus, reason?: string) {
  const body = status === "rejected" ? { status, reason: reason?.trim() ?? "" } : { status };
  return authFetch<SellerOrder>("seller", ORDERS.detail(id), { method: "PATCH", body: JSON.stringify(body) });
}

export interface OrderMove {
  to: SellerOrderStatus;
  /** The button text. */
  label: string;
  /** What happens, shown in the confirm box. */
  effect: string;
  danger?: boolean;
}

/** The only moves a seller can make from each status, one step at a time.
 * Anything else (skipping a step, moving a finished order) is refused by the
 * server, so the screen never offers it. */
export function nextMoves(status: SellerOrderStatus): OrderMove[] {
  switch (status) {
    case "pending":
      return [
        { to: "accepted", label: "Accept order", effect: "You agree to fulfil this order. The buyer is told it was accepted." },
        { to: "rejected", label: "Reject order", effect: "You refuse this order. The buyer sees your reason. This cannot be undone.", danger: true },
      ];
    case "accepted":
      return [{ to: "in_progress", label: "Start preparing", effect: "You are now preparing the order." }];
    case "in_progress":
      return [
        { to: "shipped", label: "Mark as shipped", effect: "The parcel is on its way. The buyer can no longer cancel the order." },
      ];
    case "shipped":
      return [
        { to: "delivered", label: "Mark as delivered", effect: "The parcel has arrived. A Cash on Delivery payment is marked paid. This cannot be undone." },
      ];
    default:
      return [];
  }
}
