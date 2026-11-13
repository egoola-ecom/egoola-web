"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import { formatMoney } from "@/app/(admin)/admin/(protected)/_shared/readonly-field";
import { SellerOrderRow, listSellerOrders } from "@/lib/seller-order-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebounced } from "@/lib/use-debounced";
import shell from "../../seller-shell.module.css";
import { useListingFailure } from "../listings/listing-status";
import { LoadMore } from "../jobs/load-more";
import { ORDER_STATUS_LABEL, OrderStatusBadge, PaymentStatusBadge } from "@/components/order-status";

const STATUS_FILTER = ["pending", "accepted", "in_progress", "shipped", "delivered", "rejected", "cancelled"];

/** Every order placed with this shop, newest first. Cursor paged ("Load more"),
 * so there is no total count. */
export function OrdersClient({ type }: { type: "product" | "service" }) {
  const gigs = type === "service";
  const fail = useListingFailure();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const searchTerm = useDebounced(search.trim(), 300);
  const filters = useMemo(
    () => ({ order_type: type, status, created_from: from, created_to: to }),
    [type, status, from, to],
  );

  const { items, loading, loadingMore, error, hasMore, loadMore, refetch } = useCursorList<SellerOrderRow>(
    listSellerOrders,
    searchTerm,
    filters,
    20,
    fail,
  );

  const anyFilter = Boolean(searchTerm || status || from || to);

  function clear() {
    setSearch("");
    setStatus("");
    setFrom("");
    setTo("");
  }

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={shell.pageTitle}>{gigs ? "Gig orders" : "Product orders"}</h1>
          <p className={shell.pageText} style={{ marginBottom: 0 }}>
            {gigs
              ? "Orders buyers have placed for your gigs. Open one to accept it and move it along."
              : "Orders buyers have placed for your products. Open one to accept it and move it along."}
          </p>
        </div>
        <button type="button" className={management.actionButton} onClick={refetch} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className={management.toolbar}>
        <div className={management.toolbarLeft}>
          <input
            className={management.searchInput}
            type="search"
            aria-label="Search orders"
            placeholder="Buyer name, phone, email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={management.filterSelect}
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_FILTER.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <label className={management.secondaryText}>
            From{" "}
            <input
              type="date"
              className={management.filterSelect}
              aria-label="Placed from"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className={management.secondaryText}>
            To{" "}
            <input
              type="date"
              className={management.filterSelect}
              aria-label="Placed to"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          {anyFilter && (
            <button type="button" className={management.actionButton} onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <p className={management.errorBanner}>{error}</p>}

      <div className={management.tableWrap}>
        <table className={management.table} data-testid="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Buyer</th>
              <th>Status</th>
              <th>Payment</th>
              <th>To collect</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={management.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className={management.stateRow} data-testid="orders-empty">
                  {anyFilter
                    ? "No orders match these filters."
                    : gigs
                      ? "No one has ordered one of your gigs yet."
                      : "No one has ordered one of your products yet."}
                </td>
              </tr>
            ) : (
              items.map((order) => (
                <tr key={order.id} data-testid="order-row" data-order-id={order.id}>
                  <td>
                    <Link href={`/seller/orders/${order.id}`} className={management.primaryText}>
                      Order #{order.id}
                    </Link>
                    <div className={management.secondaryText}>{formatDateTime(order.created_at)}</div>
                  </td>
                  <td>
                    <div className={management.primaryText}>{order.buyer?.name ?? "—"}</div>
                    {order.buyer?.phone && <div className={management.secondaryText}>{order.buyer.phone}</div>}
                  </td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td>
                    <PaymentStatusBadge status={order.payment_status} />
                  </td>
                  <td className={management.primaryText}>{formatMoney(order.payable)}</td>
                  <td>
                    <div className={management.rowActions}>
                      <Link href={`/seller/orders/${order.id}`} className={management.actionButton}>
                        View Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <LoadMore shown={items.length} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
    </div>
  );
}
