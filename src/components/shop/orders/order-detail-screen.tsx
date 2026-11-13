"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cancelOrder,
  canCancel,
  getOrder,
  orderProblem,
  type Order,
  type StatusHistory,
} from "@/lib/buyer/buyer-orders-api";
import { placeText } from "@/lib/buyer/buyer-addresses-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { isNotFound } from "@/lib/buyer/public-fetch";
import { durationText, PRICE_UNIT, taka } from "../money";
import { SHOP } from "../shop-links";
import { ORDER_STATUS, OrderStatusBadge, OrderTypeBadge, PAYMENT_STATUS, PaymentStatusBadge, dateTimeText } from "./order-status";

function Timeline<S extends string>({
  rows,
  labels,
  testId,
}: {
  rows: StatusHistory<S>[];
  labels: Record<string, { label: string }>;
  testId: string;
}) {
  // The server sends newest first. Sort anyway so a change there cannot flip the order.
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return (
    <ul className="list-unstyled mb-0" data-testid={testId}>
      {sorted.map((row) => (
        <li key={row.id} className="border-left pl-3 pb-3" data-testid={`${testId}-row`}>
          <div>
            <strong>{labels[row.current_status]?.label ?? row.current_status}</strong>
            {row.previous_status && (
              <span className="text-muted small"> (from {labels[row.previous_status]?.label ?? row.previous_status})</span>
            )}
          </div>
          <div className="small text-muted">
            {dateTimeText(row.created_at)}
            {row.creator_name ? ` · ${row.creator_name}` : ""}
          </div>
          {row.reason && <div className="small">Reason: {row.reason}</div>}
        </li>
      ))}
    </ul>
  );
}

export function OrderDetailScreen({ id }: { id: number }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    return getOrder(id)
      .then((next) => {
        setOrder(next);
        setError(null);
      })
      .catch((err) => {
        if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname));
        else if (isNotFound(err)) setMissing(true);
        else setError(orderProblem(err).general);
      });
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmCancel() {
    setBusy(true);
    setNotice(null);
    try {
      const next = await cancelOrder(id, reason);
      setOrder(next);
      setCancelling(false);
      setReason("");
    } catch (err) {
      if (isSignedOut(err)) {
        router.replace(loginUrlFor(window.location.pathname));
        return;
      }
      const problem = orderProblem(err);
      setNotice(problem.fields.status ?? problem.general ?? "Something went wrong. Please try again.");
      setCancelling(false);
      // The order may have moved on (shipped) since this page loaded: show it as it is.
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="container-fluid p-587 my-3 text-center py-5" data-testid="order-missing">
        <h5>We couldn&apos;t find that order</h5>
        <Link href={SHOP.orders}>Back to my orders</Link>
      </div>
    );
  }
  if (error && !order) {
    return (
      <div className="container-fluid p-587 my-3 text-center py-5">
        <p className="text-danger" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!order) return <p className="text-muted text-center py-5">Loading…</p>;

  const a = order.address;
  const reasonShown = order.status === "cancelled" ? order.cancelled_reason : order.status === "rejected" ? order.rejected_reason : null;

  return (
    <div className="container-fluid p-587 my-3">
      <p className="small mb-2">
        <Link href={SHOP.orders}>← My orders</Link>
      </p>
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
        <h4 className="mb-0">
          Order #{order.id} <OrderStatusBadge status={order.status} />{" "}
          <OrderTypeBadge type={order.order_type} />
        </h4>
        {canCancel(order.status) && !cancelling && (
          <button type="button" className="btn btn-outline-danger" data-testid="cancel-order" onClick={() => setCancelling(true)}>
            Cancel order
          </button>
        )}
      </div>

      {notice && (
        <p className="alert alert-danger" role="alert" data-testid="order-notice">
          {notice}
        </p>
      )}

      {cancelling && (
        <div className="alert alert-warning" data-testid="cancel-confirm">
          <p className="mb-2">
            Cancel this order? You can only do this before the seller ships it, and it cannot be undone.
          </p>
          <label className="small font-weight-bold mb-1" htmlFor="cancel-reason">
            Reason (optional)
          </label>
          <textarea
            id="cancel-reason"
            className="form-control mb-2"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button type="button" className="btn btn-danger btn-sm mr-2" disabled={busy} data-testid="confirm-cancel" onClick={() => void confirmCancel()}>
            {busy ? "Cancelling…" : "Yes, cancel it"}
          </button>
          <button type="button" className="btn btn-light btn-sm border" disabled={busy} onClick={() => setCancelling(false)}>
            Keep the order
          </button>
        </div>
      )}

      {reasonShown && (
        <p className="alert alert-secondary" data-testid="order-reason">
          {order.status === "cancelled" ? "Cancelled" : "Rejected"}: {reasonShown}
        </p>
      )}

      <div className="row">
        <div className="col-lg-8">
          <div className="bg-white border p-3 mb-3">
            <div className="d-flex justify-content-between flex-wrap mb-2">
              <span>
                Seller: <strong>{order.seller?.name ?? "Egoola"}</strong>
              </span>
              <span className="small text-muted">Placed {dateTimeText(order.created_at)}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0" data-testid="order-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">{order.order_type === "service" ? "Duration" : "Qty"}</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} data-testid="order-item">
                      <td>{item.title_snapshot}</td>
                      <td className="text-right">
                        {taka(item.price_snapshot)}
                        {item.qty == null && item.price_type_snapshot && item.price_type_snapshot !== "fixed" && (
                          <small className="text-muted"> / {PRICE_UNIT[item.price_type_snapshot] ?? item.price_type_snapshot}</small>
                        )}
                      </td>
                      <td className="text-right" data-testid="order-item-amount">
                        {item.qty != null
                          ? item.qty
                          : item.duration != null
                            ? durationText(item.duration, item.price_type_snapshot)
                            : "—"}
                      </td>
                      <td className="text-right">{taka(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="row small mt-3 mb-0 text-right" data-testid="order-money">
              <dt className="col-8 font-weight-normal text-muted">Subtotal</dt>
              <dd className="col-4 mb-1">{taka(order.subtotal)}</dd>
              <dt className="col-8 font-weight-normal text-muted">Delivery</dt>
              <dd className="col-4 mb-1">{taka(order.delivery_cost)}</dd>
              <dt className="col-8 font-weight-normal text-muted">Discount</dt>
              <dd className="col-4 mb-1">{taka(order.discount)}</dd>
              <dt className="col-8">To pay</dt>
              <dd className="col-4 mb-0">
                <strong data-testid="order-payable">{taka(order.payable)}</strong>
              </dd>
            </dl>
          </div>

          <div className="bg-white border p-3 mb-3">
            <h6>Order history</h6>
            <Timeline rows={order.status_histories} labels={ORDER_STATUS} testId="order-timeline" />
          </div>
        </div>

        <div className="col-lg-4">
          {a && (
            <div className="bg-white border p-3 mb-3" data-testid="order-address">
              <h6>Delivering to</h6>
              <p className="mb-1 font-weight-bold">{a.name}</p>
              <p className="mb-1">
                {a.address_line1}
                {a.address_line2 ? `, ${a.address_line2}` : ""}
              </p>
              <p className="mb-1 small text-muted">
                {a ? placeText(a) : ""}
                {a.zip ? ` — ${a.zip}` : ""}
              </p>
              <p className="mb-0 small">
                <i className="fas fa-phone-alt mr-1" /> {a.phone}
              </p>
            </div>
          )}

          {order.payment && (
            <div className="bg-white border p-3 mb-3" data-testid="order-payment">
              <h6>
                Payment <PaymentStatusBadge status={order.payment.status} />
              </h6>
              <p className="mb-2 small">
                {order.payment.method} · {taka(order.payment.amount)}
              </p>
              <Timeline rows={order.payment.status_histories} labels={PAYMENT_STATUS} testId="payment-timeline" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
