import type { CursorResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type { OrderSeller } from "./buyer/buyer-orders-api";
import type { SellerOrder, SellerOrderRow, SellerOrderStatus } from "./seller-order-api";
import { ENDPOINTS } from "./endpoints";

// ---------------------------------------------------------------------------
// Admin oversight of every product order (egoola-server docs/admin/
// admin-order-api-guide.md). Cursor paged ({next, previous, results}, no
// `count`).
//   GET   /orders/orders/        ?buyer= ?seller= ?status= ?order_type=
//                                ?created_from= ?created_to= ?search=
//   GET   /orders/orders/{id}/
//   PATCH /orders/orders/{id}/   any status, from any status, at any time
// There is no transition rule. `reason` is recorded (as the rejected or the
// cancelled reason) but never required. Moving to delivered turns a due
// payment into paid. An unknown id is a 404; a seller or buyer token is a 403.
// ---------------------------------------------------------------------------

export interface AdminOrderRow extends Omit<SellerOrderRow, "status"> {
  status: SellerOrderStatus;
  seller: OrderSeller | null;
}

export interface AdminOrder extends Omit<SellerOrder, "seller"> {
  seller: OrderSeller | null;
  created_by: number | null;
  creator_type: string | null;
  creator_name: string | null;
  updated_by: number | null;
  updater_type: string | null;
  updater_name: string | null;
}

const ORDERS = ENDPOINTS.admin.orders;

/** Pass the filters for the first page, or the server's `next` link to go on. */
export function listOrders(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${ORDERS.list}?${target}`;
  return authFetch<CursorResponse<AdminOrderRow>>("admin", path);
}

export const getOrder = (id: number) => authFetch<AdminOrder>("admin", ORDERS.detail(id));

/** Any status. A blank reason is left out. */
export function updateOrderStatus(id: number, status: SellerOrderStatus, reason?: string) {
  const text = reason?.trim();
  return authFetch<AdminOrder>("admin", ORDERS.detail(id), {
    method: "PATCH",
    body: JSON.stringify(text ? { status, reason: text } : { status }),
  });
}
