"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABEL, OrderStatusBadge, PaymentStatusBadge } from "@/components/order-status";
import { AdminOrderRow, listOrders } from "@/lib/admin-orders-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebounced } from "@/lib/use-debounced";
import { PersonPicker } from "../_shared/person-picker";
import { formatDateTime } from "../_shared/buyer-cell";
import { formatMoney } from "../_shared/readonly-field";
import styles from "../management.module.css";

/** One type of order on the platform (products, or gigs), newest first, cursor paged ("Load
 * more", no total). `buyer`, `seller` and `status` come from a link that opened
 * the page (a dashboard tile, for example) and narrow the list; they can be changed or dropped like any other filter. */
export function OrdersClient({
  type,
  buyer,
  seller,
  status: initialStatus,
}: {
  type: "product" | "service";
  buyer?: string;
  seller?: string;
  status?: string;
}) {
  const gigs = type === "service";
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState(initialStatus ?? "");
  const [buyerId, setBuyerId] = useState<number | null>(buyer ? Number(buyer) : null);
  const [sellerId, setSellerId] = useState<number | null>(seller ? Number(seller) : null);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const search = useDebounced(searchText.trim(), 300);

  const filters = useMemo(
    () => ({
      status,
      buyer: buyerId != null ? String(buyerId) : "",
      seller: sellerId != null ? String(sellerId) : "",
      created_from: createdFrom,
      created_to: createdTo,
    }),
    [status, buyerId, sellerId, createdFrom, createdTo],
  );
  const filtersActive = Boolean(search || Object.values(filters).some(Boolean));
  const serverFilters = useMemo(() => ({ ...filters, order_type: type }), [filters, type]);

  const { items, loading, loadingMore, error, hasMore, loadMore, refetch } = useCursorList<AdminOrderRow>(
    listOrders,
    search,
    serverFilters,
  );

  function clear() {
    setSearchText("");
    setStatus("");
    setBuyerId(null);
    setSellerId(null);
    setCreatedFrom("");
    setCreatedTo("");
  }

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>{gigs ? "Gig orders" : "Product orders"}</h1>
          <p className={styles.subtitle}>
            {gigs ? "Every gig (service) order on the platform." : "Every product order on the platform."} Open one to see everything about it, or to move it to any status.
          </p>
        </div>
        <button type="button" className={styles.actionButton} onClick={refetch} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search orders"
            placeholder="Search buyer name, phone, or seller name"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {ALL_ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formGrid}>
        <PersonPicker kind="buyer" label="Buyer" inputId="orders-buyer" value={buyerId} onChange={setBuyerId} />
        <PersonPicker kind="seller" label="Seller" inputId="orders-seller" value={sellerId} onChange={setSellerId} />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.secondaryText} htmlFor="order-date-from">
            Created from
          </label>
          <input
            id="order-date-from"
            type="date"
            className={styles.filterSelect}
            value={createdFrom}
            max={createdTo || undefined}
            onChange={(event) => setCreatedFrom(event.target.value)}
          />
          <label className={styles.secondaryText} htmlFor="order-date-to">
            to
          </label>
          <input
            id="order-date-to"
            type="date"
            className={styles.filterSelect}
            value={createdTo}
            min={createdFrom || undefined}
            onChange={(event) => setCreatedTo(event.target.value)}
          />
          {filtersActive && (
            <button type="button" className={styles.actionButton} onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Payable</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.stateRow} data-testid="orders-empty">
                  {filtersActive ? "No orders match these filters." : gigs ? "No gig orders have been placed yet." : "No product orders have been placed yet."}
                </td>
              </tr>
            ) : (
              items.map((order) => (
                <tr key={order.id} data-testid="order-row" data-order-id={order.id}>
                  <td>
                    <Link href={`/admin/orders/${order.id}`} className={styles.primaryText}>
                      Order #{order.id}
                    </Link>
                    <div className={styles.secondaryText}>{formatDateTime(order.created_at)}</div>
                  </td>
                  <td>
                    <div className={styles.primaryText}>{order.buyer?.name ?? "—"}</div>
                    {order.buyer?.phone && <div className={styles.secondaryText}>{order.buyer.phone}</div>}
                  </td>
                  <td>
                    <div className={styles.primaryText}>{order.seller?.name ?? "Egoola"}</div>
                    {order.seller?.phone && <div className={styles.secondaryText}>{order.seller.phone}</div>}
                  </td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td>
                    <PaymentStatusBadge status={order.payment_status} />
                  </td>
                  <td className={styles.primaryText}>{formatMoney(order.payable)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link href={`/admin/orders/${order.id}`} className={styles.actionButton}>
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          {loading ? "" : `${items.length} order${items.length === 1 ? "" : "s"} shown${hasMore ? " — more available" : ""}`}
        </span>
        <div className={styles.pageButtons}>
          <button type="button" className={styles.pageButton} disabled={!hasMore || loadingMore} onClick={loadMore}>
            {loadingMore ? "Loading…" : hasMore ? "Load more" : "No more orders"}
          </button>
        </div>
      </div>
    </div>
  );
}
