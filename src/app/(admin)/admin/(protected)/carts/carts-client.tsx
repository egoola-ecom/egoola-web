"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CartListItem, CartOrdering, listCarts } from "@/lib/admin-carts-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebounced } from "@/lib/use-debounced";
import { BuyerCell, formatDateTime } from "../_shared/buyer-cell";
import { formatMoney } from "../_shared/readonly-field";
import styles from "../management.module.css";

const SORT_OPTIONS: { value: CartOrdering; label: string }[] = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "-updated_at", label: "Recently changed" },
  { value: "updated_at", label: "Least recently changed" },
];

/** Every buyer's cart, read only. `buyer` and `listing` come from the link
 * that opened the page (a buyer's page, for example) and narrow the list;
 * they can be dropped with "Show all carts". */
export function CartsClient({ buyer, listing }: { buyer?: string; listing?: string }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [cartType, setCartType] = useState("");
  const [isActive, setIsActive] = useState("");
  const [hasOrder, setHasOrder] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [ordering, setOrdering] = useState<CartOrdering>("-created_at");
  const search = useDebounced(searchText.trim(), 300);

  const scoped = Boolean(buyer || listing);
  const filtersActive = Boolean(
    searchText || cartType || isActive || hasOrder || createdFrom || createdTo,
  );

  const { items, loading, loadingMore, error, hasMore, loadMore } =
    useCursorList<CartListItem>(listCarts, search, {
      buyer,
      listing,
      cart_type: cartType,
      is_active: isActive,
      has_order: hasOrder,
      created_from: createdFrom,
      created_to: createdTo,
      ordering,
    });

  function clear() {
    setSearchText("");
    setCartType("");
    setIsActive("");
    setHasOrder("");
    setCreatedFrom("");
    setCreatedTo("");
  }

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Carts</h1>
          <p className={styles.subtitle}>
            Every buyer&apos;s cart, to look into when helping a buyer. Read only: nothing here
            can be changed.
          </p>
        </div>
      </div>

      {scoped && (
        <p className={styles.fieldHint}>
          Showing only {buyer ? `buyer #${buyer}` : ""}
          {buyer && listing ? " and " : ""}
          {listing ? `carts holding listing #${listing}` : ""}.{" "}
          <button type="button" className={styles.actionButton} onClick={() => router.push("/admin/carts")}>
            Show all carts
          </button>
        </p>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search carts"
            placeholder="Search by buyer name, email, or phone"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by cart type"
            value={cartType}
            onChange={(event) => setCartType(event.target.value)}
          >
            <option value="">All types</option>
            <option value="product">Product</option>
            <option value="service">Service</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by open or closed"
            value={isActive}
            onChange={(event) => setIsActive(event.target.value)}
          >
            <option value="">Open and closed</option>
            <option value="true">Open</option>
            <option value="false">Closed (became an order)</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by order"
            value={hasOrder}
            onChange={(event) => setHasOrder(event.target.value)}
          >
            <option value="">With or without an order</option>
            <option value="true">Has an order</option>
            <option value="false">No order</option>
          </select>
        </div>
        <div className={styles.toolbarLeft}>
          <select
            className={styles.filterSelect}
            aria-label="Sort carts"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value as CartOrdering)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.secondaryText} htmlFor="cart-date-from">
            Created from
          </label>
          <input
            id="cart-date-from"
            type="date"
            className={styles.filterSelect}
            value={createdFrom}
            max={createdTo || undefined}
            onChange={(event) => setCreatedFrom(event.target.value)}
          />
          <label className={styles.secondaryText} htmlFor="cart-date-to">
            to
          </label>
          <input
            id="cart-date-to"
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Type</th>
              <th>State</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>Created</th>
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
                <td colSpan={7} className={styles.stateRow}>
                  No carts match.
                </td>
              </tr>
            ) : (
              items.map((cart) => (
                <tr key={cart.id}>
                  <td>
                    <BuyerCell buyer={cart.buyer} />
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeBlue}`}>{cart.cart_type}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${cart.is_active ? styles.badgeGreen : styles.badgeGray}`}
                    >
                      {cart.is_active ? "Open" : "Closed"}
                    </span>
                    {cart.order != null && (
                      <div className={styles.secondaryText}>Order #{cart.order}</div>
                    )}
                  </td>
                  <td>{cart.item_count}</td>
                  <td>{formatMoney(cart.subtotal)}</td>
                  <td className={styles.secondaryText}>{formatDateTime(cart.created_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/carts/${cart.id}`)}
                      >
                        View
                      </button>
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
          {loading
            ? ""
            : `${items.length} cart${items.length === 1 ? "" : "s"} shown${hasMore ? " — more available" : ""}`}
        </span>
        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={!hasMore || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? "Loading…" : hasMore ? "Load more" : "No more carts"}
          </button>
        </div>
      </div>
    </div>
  );
}
