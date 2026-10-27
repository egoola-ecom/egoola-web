"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FavouriteListItem, listFavourites } from "@/lib/admin-favourites-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebounced } from "@/lib/use-debounced";
import { BuyerCell, ListingThumb, formatDateTime } from "../_shared/buyer-cell";
import styles from "../management.module.css";

type Ordering = "-created_at" | "created_at";

/** Every buyer's saved listings, read only. Nothing is hidden: a listing that
 * buyers cannot see any more is still listed, marked "Hidden". */
export function WishlistsClient({ buyer, listing }: { buyer?: string; listing?: string }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [catalogType, setCatalogType] = useState("");
  const [visible, setVisible] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [ordering, setOrdering] = useState<Ordering>("-created_at");
  const search = useDebounced(searchText.trim(), 300);

  const scoped = Boolean(buyer || listing);
  const filtersActive = Boolean(searchText || catalogType || visible || createdFrom || createdTo);

  const { items, loading, loadingMore, error, hasMore, loadMore } =
    useCursorList<FavouriteListItem>(listFavourites, search, {
      buyer,
      listing,
      catalog_type: catalogType,
      listing_visible: visible,
      created_from: createdFrom,
      created_to: createdTo,
      ordering,
    });

  function clear() {
    setSearchText("");
    setCatalogType("");
    setVisible("");
    setCreatedFrom("");
    setCreatedTo("");
  }

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Wishlists</h1>
          <p className={styles.subtitle}>
            What buyers saved, including items buyers can no longer see. Read only: nothing here
            can be changed.
          </p>
        </div>
      </div>

      {scoped && (
        <p className={styles.fieldHint}>
          Showing only {buyer ? `buyer #${buyer}` : ""}
          {buyer && listing ? " and " : ""}
          {listing ? `listing #${listing}` : ""}.{" "}
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => router.push("/admin/wishlists")}
          >
            Show all
          </button>
        </p>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search wishlists"
            placeholder="Search by buyer or listing title"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by listing type"
            value={catalogType}
            onChange={(event) => setCatalogType(event.target.value)}
          >
            <option value="">All types</option>
            <option value="product">Product</option>
            <option value="service">Service</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by visibility"
            value={visible}
            onChange={(event) => setVisible(event.target.value)}
          >
            <option value="">Visible and hidden</option>
            <option value="true">Visible to buyers</option>
            <option value="false">Hidden from buyers</option>
          </select>
        </div>
        <div className={styles.toolbarLeft}>
          <select
            className={styles.filterSelect}
            aria-label="Sort wishlists"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value as Ordering)}
          >
            <option value="-created_at">Newest first</option>
            <option value="created_at">Oldest first</option>
          </select>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.secondaryText} htmlFor="fav-date-from">
            Saved from
          </label>
          <input
            id="fav-date-from"
            type="date"
            className={styles.filterSelect}
            value={createdFrom}
            max={createdTo || undefined}
            onChange={(event) => setCreatedFrom(event.target.value)}
          />
          <label className={styles.secondaryText} htmlFor="fav-date-to">
            to
          </label>
          <input
            id="fav-date-to"
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
              <th>Saved listing</th>
              <th>Visible to buyers</th>
              <th>Saved</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.stateRow}>
                  No favourites match.
                </td>
              </tr>
            ) : (
              items.map((fav) => (
                <tr key={fav.id}>
                  <td>
                    <BuyerCell buyer={fav.buyer} />
                  </td>
                  <td>
                    <div className={styles.thumbCell}>
                      <ListingThumb url={fav.listing.image_url} />
                      <div>
                        <div className={styles.primaryText}>{fav.listing.title}</div>
                        <div className={styles.secondaryText}>
                          {fav.listing.catalog_type} · #{fav.listing.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${fav.listing_visible ? styles.badgeGreen : styles.badgeAmber}`}
                    >
                      {fav.listing_visible ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>{formatDateTime(fav.created_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/wishlists/${fav.id}`)}
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
            : `${items.length} favourite${items.length === 1 ? "" : "s"} shown${hasMore ? " — more available" : ""}`}
        </span>
        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={!hasMore || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? "Loading…" : hasMore ? "Load more" : "No more favourites"}
          </button>
        </div>
      </div>
    </div>
  );
}
