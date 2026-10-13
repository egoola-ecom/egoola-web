"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandItem, listAllBrands } from "@/lib/brand-api";
import { getCategoryParentChain } from "@/lib/category-api";
import {
  ListingBulkStatus,
  ListingListItem,
  ListingStatus,
  bulkModerateListings,
  deleteListing,
  listListings,
} from "@/lib/listing-api";
import { apiErrorDetail } from "@/lib/api";
import { notifyPendingListingsChanged } from "@/lib/pending-listing-count";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import {
  CATALOG_TYPE_OPTIONS,
  LISTING_STATUS_OPTIONS,
  LISTING_TYPE_OPTIONS,
  PriceDisplay,
  formatDateTime,
  listingTypeLabel,
  statusBadgeClass,
  statusLabel,
  statusNeedsNote,
} from "./listings/listing-utils";
import styles from "../management.module.css";

const BULK_OPTIONS: { value: ListingBulkStatus; label: string }[] = [
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
  { value: "changes_requested", label: "Request changes" },
];

/** The "Listings" tab inside the Catalog panel — every listing format and
 * services in one moderated list. Row actions open the read-only details
 * page (which owns status changes + history and links to the edit page);
 * the checkboxes here drive bulk moderation. */
export function ListingsPanel({ initialStatus = "" }: { initialStatus?: ListingStatus | "" }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [catalogTypeFilter, setCatalogTypeFilter] = useState("");
  const [listingTypeFilter, setListingTypeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<ListingListItem>(listListings, search, {
      status: statusFilter || undefined,
      catalog_type: catalogTypeFilter || undefined,
      listing_type: listingTypeFilter || undefined,
      brand: brandFilter || undefined,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
      requested_from: requestedFrom || undefined,
      requested_to: requestedTo || undefined,
    });

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<number, string>>({});

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ListingBulkStatus>("approved");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<FieldErrors>({});
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeDetail, setNoticeDetail] = useState<string | null>(null);
  // Titles of everything ticked so far (selection can span pages), so a bulk
  // result can name the listings instead of only counting them.
  const titlesRef = useRef(new Map<number, string>());
  const [actionError, setActionError] = useState<string | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    listAllBrands()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  // Rows only carry a category id — resolve names for the visible page in one
  // batched parent-chain request, shown as "Parent › Child".
  useEffect(() => {
    const ids = Array.from(new Set(items.map((item) => item.category)));
    if (ids.length === 0) return;
    let cancelled = false;
    getCategoryParentChain(ids)
      .then((chains) => {
        if (cancelled) return;
        const names: Record<number, string> = {};
        for (const chain of chains) {
          names[chain.id] = [...chain.parents, chain].map((c) => c.name).join(" › ");
        }
        setCategoryNames((prev) => ({ ...prev, ...names }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  const brandNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const brand of brands) map.set(brand.id, brand.name);
    return map;
  }, [brands]);

  const pageIds = items.map((item) => item.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleOne(id: number, title: string) {
    titlesRef.current.set(id, title);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    for (const item of items) titlesRef.current.set(item.id, item.title);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleDeleteClick(item: ListingListItem) {
    if (!window.confirm(`Delete listing "${item.title}"? It will disappear from the list.`)) return;
    setActionError(null);
    setNotice(null);
    setNoticeDetail(null);
    try {
      await deleteListing(item.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      refetch();
      notifyPendingListingsChanged();
    } catch (err) {
      if (!handleAuthError(err)) {
        setActionError(apiErrorDetail(err) ?? "Couldn't delete this listing. Please try again.");
      }
    }
  }

  async function handleBulkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBulkSubmitting(true);
    setBulkErrors({});
    setBulkError(null);
    setNotice(null);
    setNoticeDetail(null);
    try {
      const trimmed = bulkNote.trim();
      const result = await bulkModerateListings({
        listing_ids: Array.from(selected),
        status: bulkStatus,
        ...(trimmed ? { note: trimmed } : {}),
      });
      setNotice(
        `${result.updated.length} listing${result.updated.length === 1 ? "" : "s"} updated` +
          (result.skipped.length > 0
            ? `, ${result.skipped.length} skipped (already ${statusLabel(bulkStatus).toLowerCase()}).`
            : "."),
      );
      const names = (ids: number[]) =>
        ids.map((id) => titlesRef.current.get(id) ?? `#${id}`).join(", ");
      setNoticeDetail(
        [
          result.updated.length > 0 ? `Updated: ${names(result.updated)}.` : "",
          result.skipped.length > 0 ? `Skipped: ${names(result.skipped)}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      setSelected(new Set());
      setBulkNote("");
      refetch();
      notifyPendingListingsChanged();
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors, message } = parseFieldErrors(err);
        setBulkErrors(fieldErrors);
        setBulkError(message);
      }
    } finally {
      setBulkSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;
  const bulkFieldError = bulkErrors.note?.[0] ?? bulkErrors.status?.[0] ?? bulkErrors.listing_ids?.[0];

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search title, Bangla title, brand, model or SKU code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {LISTING_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.actionButton}
            aria-pressed={statusFilter === "pending"}
            onClick={() => setStatusFilter(statusFilter === "pending" ? "" : "pending")}
          >
            {statusFilter === "pending" ? "Showing pending review" : "Pending review"}
          </button>
          <select
            className={styles.filterSelect}
            aria-label="Filter by catalog type"
            value={catalogTypeFilter}
            onChange={(event) => setCatalogTypeFilter(event.target.value)}
          >
            <option value="">Products &amp; services</option>
            {CATALOG_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by listing type"
            value={listingTypeFilter}
            onChange={(event) => setListingTypeFilter(event.target.value)}
          >
            <option value="">All formats</option>
            {LISTING_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by brand"
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.actionButton}
            aria-expanded={moreFilters}
            onClick={() => setMoreFilters(!moreFilters)}
          >
            {moreFilters ? "Fewer filters" : "Date filters"}
          </button>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => router.push("/admin/catalog/listings/new")}
        >
          + Add Listing
        </button>
      </div>

      {moreFilters && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {(
              [
                ["Created from", createdFrom, setCreatedFrom],
                ["Created to", createdTo, setCreatedTo],
                ["Requested from", requestedFrom, setRequestedFrom],
                ["Requested to", requestedTo, setRequestedTo],
              ] as const
            ).map(([label, value, setValue]) => (
              <label key={label} className={styles.secondaryText}>
                {label}{" "}
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {notice && (
        <p className={styles.noticeBanner}>
          {notice}
          {noticeDetail && <span className={styles.secondaryText}> {noticeDetail}</span>}
        </p>
      )}

      {selected.size > 0 && (
        <form className={styles.bulkBar} onSubmit={handleBulkSubmit}>
          <span className={styles.bulkBarCount}>{selected.size} selected</span>
          <select
            className={styles.filterSelect}
            aria-label="Bulk action"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value as ListingBulkStatus)}
          >
            {BULK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            className={`${styles.searchInput} ${styles.bulkBarNote}`}
            aria-label="Bulk moderation note"
            placeholder={
              statusNeedsNote(bulkStatus) ? "Note (required)" : "Note (optional)"
            }
            value={bulkNote}
            onChange={(event) => setBulkNote(event.target.value)}
            required={statusNeedsNote(bulkStatus)}
          />
          <button type="submit" className={styles.submitButton} disabled={bulkSubmitting}>
            {bulkSubmitting ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => setSelected(new Set())}
            disabled={bulkSubmitting}
          >
            Clear
          </button>
          {(bulkError || bulkFieldError) && (
            <p className={styles.fieldError} style={{ flexBasis: "100%" }}>
              {bulkError ?? bulkFieldError}
            </p>
          )}
        </form>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}>
                <input
                  type="checkbox"
                  aria-label="Select all listings on this page"
                  checked={allOnPageSelected}
                  disabled={items.length === 0}
                  onChange={toggleAllOnPage}
                />
              </th>
              <th>Title</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Status</th>
              <th>Requested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.stateRow}>
                  No listings found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.checkCell}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.title}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id, item.title)}
                    />
                  </td>
                  <td>
                    <div className={styles.primaryText}>{item.title}</div>
                    {item.title_bn && <div className={styles.secondaryText}>{item.title_bn}</div>}
                    <div className={styles.secondaryText}>
                      {item.catalog_type === "service" ? "Service" : "Product"}
                      {item.listing_type ? ` · ${listingTypeLabel(item.listing_type)}` : ""}
                    </div>
                  </td>
                  <td className={styles.secondaryText}>
                    {categoryNames[item.category] ?? `#${item.category}`}
                  </td>
                  <td className={styles.secondaryText}>
                    {item.brand != null ? (brandNames.get(item.brand) ?? `#${item.brand}`) : "—"}
                  </td>
                  <td>
                    <PriceDisplay price={item.price} discountedPrice={item.discounted_price} from />
                  </td>
                  <td>
                    <span className={`${styles.badge} ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>
                    {item.requested_at ? formatDateTime(item.requested_at) : "—"}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/catalog/listings/${item.id}`)}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        onClick={() => handleDeleteClick(item)}
                      >
                        Delete
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
          {count === 0 ? "0 results" : `Page ${currentPage} of ${totalPages} — ${count} total`}
        </span>
        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.pageButton}
            disabled={offset + pageSize >= count}
            onClick={() => setOffset(offset + pageSize)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
