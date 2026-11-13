"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { ReadonlyField, formatMoney } from "@/app/(admin)/admin/(protected)/_shared/readonly-field";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import { Modal } from "@/components/modal";
import { placeText } from "@/lib/buyer/buyer-addresses-api";
import { ApiError } from "@/lib/api";
import { describeLoadError } from "@/lib/load-error";
import {
  OrderMove,
  SellerOrder,
  getSellerOrder,
  moveSellerOrder,
  nextMoves,
} from "@/lib/seller-order-api";
import { parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { useListingFailure } from "../../listings/listing-status";
import { useSeller } from "../../seller-context";
import {
  ORDER_STATUS_LABEL,
  OrderStatusBadge,
  itemAmountText,
  itemRateUnit,
  PAYMENT_STATUS_LABEL,
  PaymentStatusBadge,
} from "@/components/order-status";

/** What the seller needs to know about where the order stands. */
function standing(order: SellerOrder): string | null {
  switch (order.status) {
    case "pending":
      return "A buyer is waiting. Accept the order to start, or reject it with a reason.";
    case "accepted":
      return "You accepted this order. Start preparing it when you are ready.";
    case "in_progress":
      return "You are preparing this order. Mark it as shipped when it leaves.";
    case "shipped":
      return "This order is on its way. Mark it as delivered when it arrives.";
    case "delivered":
      return "This order was delivered and the payment is collected.";
    case "rejected":
      return "You rejected this order. Nothing more can be done with it.";
    case "cancelled":
      return "The buyer cancelled this order. Nothing more can be done with it.";
    default:
      return null;
  }
}

function errorText(err: unknown): string {
  const { fieldErrors, message } = parseFieldErrors(err);
  return (
    fieldErrors.reason?.[0] ??
    fieldErrors.status?.[0] ??
    fieldErrors.detail?.[0] ??
    Object.values(fieldErrors)[0]?.[0] ??
    message ??
    "Something went wrong. Please try again."
  );
}

function Timeline<S extends string>({
  rows,
  labels,
  testId,
}: {
  rows: { id: number; previous_status: S | null; current_status: S; reason?: string | null; creator_name: string | null; created_at: string }[];
  labels: Record<string, string>;
  testId: string;
}) {
  // Newest first, whatever order the server sent.
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return (
    <ul className={management.changeLog} data-testid={testId}>
      {sorted.map((row) => (
        <li key={row.id} className={management.changeRow} data-testid={`${testId}-row`}>
          <div className={management.changeHead}>
            <strong>{labels[row.current_status] ?? row.current_status}</strong>
            {row.previous_status && (
              <span className={management.secondaryText}>from {labels[row.previous_status] ?? row.previous_status}</span>
            )}
            <span className={management.secondaryText}>
              {formatDateTime(row.created_at)}
              {row.creator_name ? ` · ${row.creator_name}` : ""}
            </span>
          </div>
          {row.reason && (
            <div className={management.changeBody}>
              <span>Reason: {row.reason}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function OrderDetailClient({ id }: { id: number }) {
  const fail = useListingFailure();
  const { handleAuthError } = useSeller();
  const [order, setOrder] = useState<SellerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moving, setMoving] = useState<OrderMove | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await getSellerOrder(id));
      setLoadError(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setLoadError(
        describeLoadError(err, "This order was not found.", "Couldn't load this order. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [id, handleAuthError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function open(move: OrderMove) {
    setDialogError(null);
    setReason("");
    setNotice(null);
    setMoving(move);
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!moving || busy) return;
    if (moving.to === "rejected" && !reason.trim()) return;
    setBusy(true);
    setDialogError(null);
    try {
      // The answer is the whole order: replace it, never merge.
      setOrder(await moveSellerOrder(id, moving.to, reason));
      setMoving(null);
    } catch (err) {
      if (fail(err) == null) return;
      if (err instanceof ApiError && err.status === 400 && moving.to !== "rejected") {
        // Most likely the order moved on (the buyer cancelled) while this page
        // was open: say so, and show the order as it really is now.
        setMoving(null);
        setNotice(errorText(err));
        await load();
      } else if (err instanceof ApiError && err.status === 404) {
        setMoving(null);
        setLoadError("This order was not found.");
      } else {
        setDialogError(errorText(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const backHref = order?.order_type === "service" ? "/seller/orders/gigs" : "/seller/orders";

  if (loading) return <p className={management.stateRow}>Loading…</p>;
  if (loadError || !order) {
    return (
      <div>
        <Link href={backHref} className={management.backLink}>
          ← Back to orders
        </Link>
        <p className={management.errorBanner} data-testid="order-load-error">
          {loadError ?? "Order not found."}
        </p>
      </div>
    );
  }

  const moves = nextMoves(order.status);
  const text = standing(order);
  const place = order.address ? placeText(order.address) : "";
  const reasonShown =
    order.status === "rejected" ? order.rejected_reason : order.status === "cancelled" ? order.cancelled_reason : null;

  return (
    <div>
      <Link href={backHref} className={management.backLink}>
        ← Back to orders
      </Link>

      <div className={management.detailHeader}>
        <div className={management.detailHeaderInfo}>
          <h1 className={shell.pageTitle}>Order #{order.id}</h1>
          <p className={management.subtitle}>Placed {formatDateTime(order.created_at)}</p>
          <div className={management.detailBadgeRow}>
            <OrderStatusBadge status={order.status} />
            <span className={management.secondaryText}>Payment</span>
            <PaymentStatusBadge status={order.payment_status} />
          </div>
        </div>
        <div className={management.rowActions} data-testid="order-moves">
          {moves.map((move) => (
            <button
              key={move.to}
              type="button"
              className={`${management.actionButton} ${move.danger ? management.actionButtonDanger : ""}`}
              data-testid={`move-${move.to}`}
              onClick={() => open(move)}
            >
              {move.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p className={management.errorBanner} role="alert" data-testid="order-notice">
          {notice}
        </p>
      )}
      {text && (
        <p className={management.noticeBanner} role="status" data-testid="order-standing">
          {text}
        </p>
      )}
      {reasonShown && (
        <p className={management.noticeBanner} data-testid="order-reason">
          {order.status === "rejected" ? "Rejected" : "Cancelled"}: {reasonShown}
        </p>
      )}

      <div className={management.detailCard} data-testid="order-buyer">
        <h2 className={management.detailCardTitle}>Buyer</h2>
        <div className={management.formGrid}>
          <ReadonlyField label="Name" value={order.buyer?.name ?? "—"} />
          <ReadonlyField label="Phone" value={order.buyer?.phone ?? "—"} />
          <ReadonlyField label="Email" value={order.buyer?.email ?? "—"} />
          <ReadonlyField label="Account" value={order.buyer?.status ?? "—"} />
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Items</h2>
        <div className={management.tableWrap}>
          <table className={management.table} data-testid="order-items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>{order.order_type === "service" ? "Duration" : "Qty"}</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} data-testid="order-item">
                  <td className={management.primaryText}>{item.title_snapshot}</td>
                  <td>
                    {formatMoney(item.price_snapshot)}
                    {itemRateUnit(item)}
                  </td>
                  <td>{itemAmountText(item)}</td>
                  <td>{formatMoney(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={management.formGrid} data-testid="order-money" style={{ marginTop: "0.9rem" }}>
          <ReadonlyField label="Subtotal" value={formatMoney(order.subtotal)} />
          <ReadonlyField label="Delivery" value={formatMoney(order.delivery_cost)} />
          <ReadonlyField label="Discount" value={formatMoney(order.discount)} />
          <ReadonlyField label="To collect" value={formatMoney(order.payable)} />
        </div>
      </div>

      {order.address && (
        <div className={management.detailCard} data-testid="order-address">
          <h2 className={management.detailCardTitle}>Delivery address</h2>
          <div className={management.formGrid}>
            <ReadonlyField label="Recipient" value={order.address.name} />
            <ReadonlyField label="Phone" value={order.address.phone} />
            <div className={management.formGridFull}>
              <ReadonlyField
                label="Address"
                value={[order.address.address_line1, order.address.address_line2].filter(Boolean).join(", ")}
              />
            </div>
            <ReadonlyField label="Area" value={place || "—"} />
            <ReadonlyField label="Zip" value={order.address.zip ?? "—"} />
          </div>
        </div>
      )}

      {order.payment && (
        <div className={management.detailCard} data-testid="order-payment">
          <h2 className={management.detailCardTitle}>Payment</h2>
          <div className={management.formGrid}>
            <ReadonlyField label="Method" value={order.payment.method} />
            <ReadonlyField label="Amount" value={formatMoney(order.payment.amount)} />
            <div className={management.field}>
              <span className={management.label}>Status</span>
              <p className={management.readonlyValue}>
                <PaymentStatusBadge status={order.payment.status} />
              </p>
            </div>
          </div>
          <h3 className={management.detailCardSubtitle}>Payment history</h3>
          <Timeline rows={order.payment.status_histories} labels={PAYMENT_STATUS_LABEL} testId="payment-timeline" />
        </div>
      )}

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Order history</h2>
        <Timeline rows={order.status_histories} labels={ORDER_STATUS_LABEL} testId="order-timeline" />
      </div>

      {moving && (
        <Modal title={moving.label} onClose={() => !busy && setMoving(null)}>
          <form onSubmit={confirm}>
            <p className={management.fieldHint}>{moving.effect}</p>
            {moving.to === "rejected" && (
              <div className={management.field}>
                <label className={management.label} htmlFor="reject-reason">
                  Reason (the buyer sees this)
                </label>
                <textarea
                  id="reject-reason"
                  className={management.textarea}
                  rows={3}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            )}
            {dialogError && (
              <p className={management.fieldError} data-testid="move-error">
                {dialogError}
              </p>
            )}
            <div className={management.formActions}>
              <button type="button" className={management.cancelButton} onClick={() => setMoving(null)} disabled={busy}>
                Not now
              </button>
              <button
                type="submit"
                className={moving.danger ? management.dangerButton : management.submitButton}
                disabled={busy || (moving.to === "rejected" && !reason.trim())}
                data-testid="confirm-move"
              >
                {busy ? "Working…" : moving.label}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
