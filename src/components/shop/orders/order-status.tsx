import type { PaymentStatus, OrderStatus, OrderType } from "@/lib/buyer/buyer-orders-api";

export const ORDER_STATUS: Record<OrderStatus, { label: string; badge: string }> = {
  pending: { label: "Pending", badge: "badge-warning" },
  accepted: { label: "Accepted", badge: "badge-info" },
  in_progress: { label: "In progress", badge: "badge-primary" },
  shipped: { label: "Shipped", badge: "badge-secondary" },
  delivered: { label: "Delivered", badge: "badge-success" },
  rejected: { label: "Rejected", badge: "badge-dark" },
  cancelled: { label: "Cancelled", badge: "badge-danger" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; badge: string }> = {
  due: { label: "Due", badge: "badge-warning" },
  initiated: { label: "Started", badge: "badge-info" },
  paid: { label: "Paid", badge: "badge-success" },
  failed: { label: "Failed", badge: "badge-danger" },
  cancelled: { label: "Cancelled", badge: "badge-secondary" },
  partially_paid: { label: "Part paid", badge: "badge-primary" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const known = ORDER_STATUS[status];
  return (
    <span className={`badge ${known?.badge ?? "badge-light"} p-2`} data-testid="order-status">
      {known?.label ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const known = PAYMENT_STATUS[status];
  return (
    <span className={`badge ${known?.badge ?? "badge-light"} p-2`} data-testid="payment-status">
      {known?.label ?? status}
    </span>
  );
}

export function dateTimeText(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTypeBadge({ type }: { type: OrderType }) {
  return (
    <span className="badge badge-light border p-2" data-testid="order-type">
      {type === "service" ? "Service" : "Product"}
    </span>
  );
}
