import management from "@/app/(admin)/admin/(protected)/management.module.css";
import type { PaymentStatus } from "@/lib/buyer/buyer-orders-api";
import type { SellerOrderStatus } from "@/lib/seller-order-api";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In progress",
  shipped: "Shipped",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
  disputed: "Disputed",
  completed: "Completed",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  due: "Due",
  initiated: "Started",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  partially_paid: "Part paid",
};

/** One palette for every role (seller, admin), so the colours agree. Each status has its own colour. Amber waits, blue is being worked on, grey
 * is on its way, green is done, red is over without a delivery. */
export function orderStatusClass(status: SellerOrderStatus): string {
  switch (status) {
    case "pending":
    case "disputed":
      return management.badgeAmber;
    case "accepted":
    case "in_progress":
      return management.badgeBlue;
    case "shipped":
      return management.badgeGray;
    case "delivered":
    case "completed":
      return management.badgeGreen;
    default:
      return management.badgeRed;
  }
}

export function paymentStatusClass(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return management.badgeGreen;
    case "due":
      return management.badgeAmber;
    case "initiated":
    case "partially_paid":
      return management.badgeBlue;
    case "failed":
      return management.badgeRed;
    default:
      return management.badgeGray;
  }
}

export function OrderStatusBadge({ status }: { status: SellerOrderStatus }) {
  return (
    <span className={`${management.badge} ${orderStatusClass(status)}`} data-testid="order-status">
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`${management.badge} ${paymentStatusClass(status)}`} data-testid="payment-status">
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Every status an order can have, in flow order. Admin may pick any of them. */
export const ALL_ORDER_STATUSES: SellerOrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "shipped",
  "delivered",
  "rejected",
  "cancelled",
  "completed",
  "disputed",
];
