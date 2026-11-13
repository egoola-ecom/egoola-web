"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ALL_ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  OrderStatusBadge,
  PAYMENT_STATUS_LABEL,
  PaymentStatusBadge,
  itemAmountText,
  itemRateUnit,
} from "@/components/order-status";
import { Modal } from "@/components/modal";
import { AdminOrder, getOrder, updateOrderStatus } from "@/lib/admin-orders-api";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { placeText } from "@/lib/buyer/buyer-addresses-api";
import type { SellerOrderStatus } from "@/lib/seller-order-api";
import { parseFieldErrors } from "@/lib/use-managed-list";
import { actorLabel, formatDateTime } from "../../_shared/buyer-cell";
import { ReadonlyField, formatMoney } from "../../_shared/readonly-field";
import styles from "../../management.module.css";

function Timeline({
  rows,
  labels,
  testId,
}: {
  rows: { id: number; previous_status: string | null; current_status: string; reason?: string | null; creator_name: string | null; creator_type: string | null; created_at: string }[];
  labels: Record<string, string>;
  testId: string;
}) {
  // Newest first, whatever order the server sent.
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  if (sorted.length === 0) return <p className={styles.secondaryText}>No history yet.</p>;
  return (
    <ul className={styles.changeLog} data-testid={testId}>
      {sorted.map((row) => (
        <li key={row.id} className={styles.changeRow} data-testid={`${testId}-row`}>
          <div className={styles.changeHead}>
            <strong>{labels[row.current_status] ?? row.current_status}</strong>
            {row.previous_status && (
              <span className={styles.secondaryText}>from {labels[row.previous_status] ?? row.previous_status}</span>
            )}
            <span className={styles.secondaryText}>
              {formatDateTime(row.created_at)} · {actorLabel(row.creator_name, row.creator_type)}
            </span>
          </div>
          {row.reason && (
            <div className={styles.changeBody}>
              <span>Reason: {row.reason}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) return "You are not allowed to change this order.";
  if (err instanceof ApiError && err.status === 404) return "This order does not exist.";
  const { fieldErrors, message } = parseFieldErrors(err);
  return (
    fieldErrors.status?.[0] ??
    fieldErrors.reason?.[0] ??
    fieldErrors.detail?.[0] ??
    Object.values(fieldErrors)[0]?.[0] ??
    message ??
    "Something went wrong. Please try again."
  );
}

export function OrderDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<SellerOrderStatus>("pending");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function authFailed(err: unknown): boolean {
    if (!(err instanceof AuthError)) return false;
    clearSession("admin");
    router.replace("/admin/login");
    return true;
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);
    getOrder(id)
      .then((detail) => {
        if (cancelled) return;
        setOrder(detail);
        setTarget(detail.status);
      })
      .catch((err) => {
        if (cancelled || authFailed(err)) return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "This order does not exist."
            : err instanceof ApiError && err.status === 403
              ? "You are not allowed to see this."
              : "Couldn't load this order. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function apply() {
    if (!order || busy) return;
    setBusy(true);
    setSaveError(null);
    try {
      const from = order.status;
      // The answer is the whole order: replace it, never merge.
      const next = await updateOrderStatus(id, target, target === "rejected" || target === "cancelled" ? reason : undefined);
      setOrder(next);
      setTarget(next.status);
      setReason("");
      setConfirming(false);
      setSaved(`Order #${id} moved from ${ORDER_STATUS_LABEL[from] ?? from} to ${ORDER_STATUS_LABEL[next.status] ?? next.status}.`);
    } catch (err) {
      if (authFailed(err)) return;
      setSaveError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !order) {
    return (
      <div>
        <button type="button" className={styles.backLink} onClick={() => router.push(order?.order_type === "service" ? "/admin/orders/gigs" : "/admin/orders")}>
          ← Back to Orders
        </button>
        <p className={styles.errorBanner} data-testid="order-load-error">
          {loadError ?? "Order not found."}
        </p>
      </div>
    );
  }

  const a = order.address;
  const askReason = target === "rejected" || target === "cancelled";
  const reasonShown =
    order.rejected_reason || order.cancelled_reason
      ? [
          order.rejected_reason ? `Rejected reason: ${order.rejected_reason}` : null,
          order.cancelled_reason ? `Cancelled reason: ${order.cancelled_reason}` : null,
        ].filter(Boolean)
      : [];

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push(order?.order_type === "service" ? "/admin/orders/gigs" : "/admin/orders")}>
        ← Back to Orders
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Order #{order.id}</h1>
          <p className={styles.subtitle}>
            {order.order_type === "service" ? "Gig" : order.order_type === "product" ? "Product" : order.order_type} order · placed {formatDateTime(order.created_at)}
          </p>
          <div className={styles.detailBadgeRow}>
            <OrderStatusBadge status={order.status} />
            <span className={styles.secondaryText}>Payment</span>
            <PaymentStatusBadge status={order.payment_status} />
          </div>
        </div>
      </div>

      {saved && (
        <p className={styles.noticeBanner} role="status" data-testid="order-saved">
          {saved}
        </p>
      )}
      {reasonShown.length > 0 && (
        <div className={styles.noticeBanner} data-testid="order-reason">
          {reasonShown.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}

      <section className={styles.detailCard} data-testid="order-override">
        <h2 className={styles.detailCardTitle}>Change status</h2>
        <p className={styles.fieldHint}>
          An admin can move an order to any status from any status, forwards or backwards. Use it to fix a mistake or
          settle a dispute. Every move is kept in the history.
        </p>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="order-target">
              New status
            </label>
            <select
              id="order-target"
              className={styles.select}
              value={target}
              onChange={(event) => setTarget(event.target.value as SellerOrderStatus)}
            >
              {ALL_ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          {askReason && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="order-reason-input">
                Reason (optional, but please give one)
              </label>
              <textarea
                id="order-reason-input"
                className={styles.textarea}
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          )}
        </div>
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.submitButton}
            data-testid="apply-status"
            disabled={target === order.status || busy}
            onClick={() => {
              setSaveError(null);
              setSaved(null);
              setConfirming(true);
            }}
          >
            Apply status
          </button>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>People</h2>
        <div className={styles.formGrid}>
          <div data-testid="order-buyer">
            <span className={styles.label}>Buyer</span>
            {order.buyer ? (
              <>
                <p className={styles.primaryText}>
                  <Link href={`/admin/buyers/${order.buyer.id}`}>{order.buyer.name}</Link>
                </p>
                <p className={styles.secondaryText}>
                  {[order.buyer.phone, order.buyer.email].filter(Boolean).join(" · ") || "—"}
                  {" · "}Wallet {formatMoney(order.buyer.wallet_balance)} · Account {order.buyer.status}
                </p>
                <p>
                  <Link href={`/admin/orders?buyer=${order.buyer.id}`}>All orders of this buyer</Link>
                </p>
              </>
            ) : (
              <p className={styles.secondaryText}>—</p>
            )}
          </div>
          <div data-testid="order-seller">
            <span className={styles.label}>Seller</span>
            {order.seller ? (
              <>
                <p className={styles.primaryText}>
                  <Link href={`/admin/sellers/${order.seller.id}`}>{order.seller.name}</Link>
                </p>
                <p className={styles.secondaryText}>{order.seller.phone ?? "—"}</p>
                <p>
                  <Link href={`/admin/orders?seller=${order.seller.id}`}>All orders of this seller</Link>
                </p>
              </>
            ) : (
              <p className={styles.secondaryText}>Sold by Egoola</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Items</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table} data-testid="order-items">
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
                  <td className={styles.primaryText}>
                    {item.title_snapshot}
                    <div className={styles.secondaryText}>listing #{item.listing}</div>
                  </td>
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
        <div className={styles.formGrid} data-testid="order-money" style={{ marginTop: "0.9rem" }}>
          <ReadonlyField label="Total (before discount)" value={formatMoney(order.total)} />
          <ReadonlyField label="Subtotal" value={formatMoney(order.subtotal)} />
          <ReadonlyField label="Delivery" value={formatMoney(order.delivery_cost)} />
          <ReadonlyField label="Discount" value={formatMoney(order.discount)} />
          <ReadonlyField label="Payable" value={formatMoney(order.payable)} />
        </div>
      </section>

      {a && (
        <section className={styles.detailCard} data-testid="order-address">
          <h2 className={styles.detailCardTitle}>Delivery address</h2>
          <div className={styles.formGrid}>
            <ReadonlyField label="Recipient" value={a.name} />
            <ReadonlyField label="Phone" value={a.phone} />
            <div className={styles.formGridFull}>
              <ReadonlyField label="Address" value={[a.address_line1, a.address_line2].filter(Boolean).join(", ")} />
            </div>
            <ReadonlyField label="Area" value={placeText(a) || "—"} />
            <ReadonlyField label="Zip" value={a.zip ?? "—"} />
          </div>
        </section>
      )}

      {order.payment && (
        <section className={styles.detailCard} data-testid="order-payment">
          <h2 className={styles.detailCardTitle}>Payment</h2>
          <div className={styles.formGrid}>
            <ReadonlyField label="Method" value={order.payment.method} />
            <ReadonlyField label="Amount" value={formatMoney(order.payment.amount)} />
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <p className={styles.readonlyValue}>
                <PaymentStatusBadge status={order.payment.status} />
              </p>
            </div>
          </div>
          <h3 className={styles.detailCardSubtitle}>Payment history</h3>
          <Timeline rows={order.payment.status_histories} labels={PAYMENT_STATUS_LABEL} testId="payment-timeline" />
        </section>
      )}

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Order history</h2>
        <Timeline rows={order.status_histories} labels={ORDER_STATUS_LABEL} testId="order-timeline" />
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Record</h2>
        <div className={styles.formGrid} data-testid="order-audit">
          <ReadonlyField label="Created" value={formatDateTime(order.created_at)} />
          <ReadonlyField label="Created by" value={actorLabel(order.creator_name, order.creator_type)} />
          <ReadonlyField label="Last changed" value={formatDateTime(order.updated_at)} />
          <ReadonlyField label="Changed by" value={actorLabel(order.updater_name, order.updater_type)} />
          <ReadonlyField label="Expected delivery" value={formatDateTime(order.expected_delivery_at)} />
          <ReadonlyField label="Completed" value={formatDateTime(order.completed_at)} />
        </div>
      </section>

      {confirming && (
        <Modal title="Change order status" onClose={() => !busy && setConfirming(false)}>
          <p className={styles.fieldHint} data-testid="confirm-text">
            Move order #{order.id} from <strong>{ORDER_STATUS_LABEL[order.status]}</strong> to{" "}
            <strong>{ORDER_STATUS_LABEL[target]}</strong>?
            {target === "delivered" && order.payment?.status === "due" ? " The payment will be marked paid." : ""}
          </p>
          {askReason && !reason.trim() && (
            <p className={styles.fieldHint}>No reason was given. That is allowed, but a reason helps whoever reads the history.</p>
          )}
          {askReason && reason.trim() && <p className={styles.fieldHint}>Reason: {reason.trim()}</p>}
          {saveError && (
            <p className={styles.fieldError} data-testid="save-error">
              {saveError}
            </p>
          )}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setConfirming(false)} disabled={busy}>
              Not now
            </button>
            <button type="button" className={styles.submitButton} onClick={() => void apply()} disabled={busy} data-testid="confirm-status">
              {busy ? "Working…" : "Change status"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
