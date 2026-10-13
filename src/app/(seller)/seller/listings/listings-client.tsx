"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  CATALOG_TYPE_OPTIONS,
  LISTING_TYPE_OPTIONS,
  PriceDisplay,
  formatDateTime,
  listingTypeLabel,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import {
  SellerListingRow,
  SellerLookupBrand,
  SellerLookupCategory,
  listSellerBrands,
  listSellerCategories,
  listSellerListings,
} from "@/lib/seller-listing-api";
import shell from "../../seller-shell.module.css";
import {
  SELLER_STATUS_FILTER,
  SellerStatusChip,
  useListingFailure,
} from "./listing-status";

const PAGE_SIZE = 20;

const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "-updated_at", label: "Recently changed" },
  { value: "-requested_at", label: "Latest sent for review" },
  { value: "title", label: "Title A–Z" },
  { value: "-title", label: "Title Z–A" },
  { value: "status", label: "Status" },
];

/** Category rows indented by depth, so one dropdown shows the tree. */
function categoryOptions(rows: SellerLookupCategory[]) {
  const byParent = new Map<number | null, SellerLookupCategory[]>();
  const ids = new Set(rows.map((row) => row.id));
  for (const row of rows) {
    const key = row.parent != null && ids.has(row.parent) ? row.parent : null;
    byParent.set(key, [...(byParent.get(key) ?? []), row]);
  }
  const out: { id: number; label: string; path: string }[] = [];
  const walk = (parent: number | null, depth: number, trail: string[]) => {
    const list = (byParent.get(parent) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    for (const row of list) {
      const name = row.name_bn ? `${row.name} (${row.name_bn})` : row.name;
      out.push({
        id: row.id,
        label: `${"  ".repeat(depth)}${name}`,
        path: [...trail, row.name].join(" › "),
      });
      walk(row.id, depth + 1, [...trail, row.name]);
    }
  };
  walk(null, 0, []);
  return out;
}

export function ListingsClient() {
  const fail = useListingFailure();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [catalogType, setCatalogType] = useState("");
  const [listingType, setListingType] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [offset, setOffset] = useState(0);
  const [moreFilters, setMoreFilters] = useState(false);

  const [rows, setRows] = useState<SellerListingRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<SellerLookupCategory[]>([]);
  const [brands, setBrands] = useState<SellerLookupBrand[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    Promise.all([listSellerCategories("product"), listSellerCategories("service")])
      .then(([products, services]) => setCategories([...products, ...services]))
      .catch(() => setCategories([]));
    listSellerBrands()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  const categoryList = useMemo(() => categoryOptions(categories), [categories]);
  const categoryPath = useMemo(
    () => new Map(categoryList.map((option) => [option.id, option.path])),
    [categoryList],
  );
  const brandNames = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  const filterKey = JSON.stringify([
    debouncedSearch,
    status,
    catalogType,
    listingType,
    category,
    brand,
    createdFrom,
    createdTo,
    requestedFrom,
    requestedTo,
    ordering,
  ]);

  // A new search / filter / sort starts again from the first page.
  const previousFilterKey = useRef(filterKey);
  useEffect(() => {
    if (previousFilterKey.current !== filterKey) {
      previousFilterKey.current = filterKey;
      setOffset(0);
    }
  }, [filterKey]);

  const generation = useRef(0);
  useEffect(() => {
    const mine = ++generation.current;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      ordering,
    });
    const filters: Record<string, string> = {
      search: debouncedSearch,
      status,
      catalog_type: catalogType,
      listing_type: listingType,
      category,
      brand,
      created_from: createdFrom,
      created_to: createdTo,
      requested_from: requestedFrom,
      requested_to: requestedTo,
    };
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    listSellerListings(params)
      .then((response) => {
        if (generation.current !== mine) return;
        setRows(response.results);
        setCount(response.count);
        setError(null);
      })
      .catch((err) => {
        if (generation.current !== mine) return;
        const message = fail(err);
        if (message) setError(message);
      })
      .finally(() => {
        if (generation.current === mine) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, offset]);

  const anyFilter = [
    debouncedSearch,
    status,
    catalogType,
    listingType,
    category,
    brand,
    createdFrom,
    createdTo,
    requestedFrom,
    requestedTo,
  ].some(Boolean);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setCatalogType("");
    setListingType("");
    setCategory("");
    setBrand("");
    setCreatedFrom("");
    setCreatedTo("");
    setRequestedFrom("");
    setRequestedTo("");
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={shell.pageTitle}>My listings</h1>
          <p className={shell.pageText} style={{ marginBottom: 0 }}>
            Everything you sell. A new listing waits for an admin to check it.
          </p>
        </div>
        <Link href="/seller/listings/new" className={management.addButton}>
          + Create listing
        </Link>
      </div>

      <div className={management.toolbar}>
        <div className={management.toolbarLeft}>
          <input
            className={management.searchInput}
            type="search"
            aria-label="Search listings"
            placeholder="Search title, Bangla title, SKU code or brand"
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
            {SELLER_STATUS_FILTER.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={management.filterSelect}
            aria-label="Filter by product or service"
            value={catalogType}
            onChange={(event) => setCatalogType(event.target.value)}
          >
            <option value="">Products &amp; services</option>
            {CATALOG_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={management.filterSelect}
            aria-label="Sort by"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value)}
          >
            {ORDERING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={management.actionButton}
            aria-expanded={moreFilters}
            onClick={() => setMoreFilters(!moreFilters)}
          >
            {moreFilters ? "Fewer filters" : "More filters"}
          </button>
          {anyFilter && (
            <button type="button" className={management.actionButton} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {moreFilters && (
        <div className={management.toolbar}>
          <div className={management.toolbarLeft}>
            <select
              className={management.filterSelect}
              aria-label="Filter by format"
              value={listingType}
              onChange={(event) => setListingType(event.target.value)}
            >
              <option value="">All formats</option>
              {LISTING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              className={management.filterSelect}
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categoryList.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={management.filterSelect}
              aria-label="Filter by brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            >
              <option value="">All brands</option>
              {brands.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {(
              [
                ["Created from", createdFrom, setCreatedFrom],
                ["Created to", createdTo, setCreatedTo],
                ["Sent for review from", requestedFrom, setRequestedFrom],
                ["Sent for review to", requestedTo, setRequestedTo],
              ] as const
            ).map(([label, value, setValue]) => (
              <label key={label} className={management.secondaryText}>
                {label}{" "}
                <input
                  type="date"
                  className={management.filterSelect}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className={management.errorBanner}>{error}</p>}

      <div className={management.tableWrap}>
        <table className={management.table}>
          <thead>
            <tr>
              <th>Listing</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Updated</th>
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={management.stateRow}>
                  {anyFilter ? (
                    "No listings match these filters."
                  ) : (
                    <>
                      You have no listings yet.{" "}
                      <Link href="/seller/listings/new">Create your first listing</Link>.
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/seller/listings/${item.id}`} className={management.primaryText}>
                      {item.title}
                    </Link>
                    {item.title_bn && <div className={management.secondaryText}>{item.title_bn}</div>}
                    <div className={management.secondaryText}>
                      {item.catalog_type === "service" ? "Service" : "Product"}
                      {item.listing_type ? ` · ${listingTypeLabel(item.listing_type)}` : ""}
                      {item.brand != null ? ` · ${brandNames.get(item.brand) ?? `#${item.brand}`}` : ""}
                    </div>
                  </td>
                  <td className={management.secondaryText}>
                    {categoryPath.get(item.category) ?? `#${item.category}`}
                  </td>
                  <td>
                    <PriceDisplay price={item.price} discountedPrice={item.discounted_price} from />
                  </td>
                  <td>
                    <SellerStatusChip status={item.status} />
                    {(item.status === "rejected" || item.status === "changes_requested") &&
                      item.note && (
                        <div className={management.secondaryText}>Reason: {item.note}</div>
                      )}
                  </td>
                  <td className={management.secondaryText}>{formatDateTime(item.updated_at)}</td>
                  <td>
                    <div className={management.rowActions}>
                      <Link href={`/seller/listings/${item.id}`} className={management.actionButton}>
                        View
                      </Link>
                      <Link
                        href={`/seller/listings/${item.id}/edit`}
                        className={management.actionButton}
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={management.pagination}>
        <span className={management.pageInfo}>
          {count === 0 ? "0 results" : `Page ${currentPage} of ${totalPages} — ${count} total`}
        </span>
        <div className={management.pageButtons}>
          <button
            type="button"
            className={management.pageButton}
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            type="button"
            className={management.pageButton}
            disabled={offset + PAGE_SIZE >= count || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
