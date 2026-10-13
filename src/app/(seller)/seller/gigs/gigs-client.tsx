"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { PRICE_TYPE_OPTIONS, RateDisplay } from "@/app/(admin)/admin/(protected)/gigs/gig-utils";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import { RowThumbnail } from "@/components/thumbnail-control";
import { SellerGigRow, listSellerGigs } from "@/lib/seller-gig-api";
import { SellerLookupCategory, listSellerCategories } from "@/lib/seller-listing-api";
import shell from "../../seller-shell.module.css";
import { SELLER_STATUS_FILTER, SellerStatusChip, useListingFailure } from "../listings/listing-status";

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

/** "My gigs": the seller's service offers, with a Create button. Gigs are
 * priced by packages, so a row shows the lowest rate and what it is for. */
export function GigsClient() {
  const fail = useListingFailure();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priceType, setPriceType] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<SellerGigRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<SellerLookupCategory[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    listSellerCategories("service")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const filterKey = JSON.stringify([debouncedSearch, status, priceType, ordering]);

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
      price_type: priceType,
    };
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    listSellerGigs(params)
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

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? `#${id}`;
  const anyFilter = Boolean(debouncedSearch || status || priceType);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={shell.pageTitle}>My gigs</h1>
          <p className={shell.pageText} style={{ marginBottom: 0 }}>
            The services you offer, each priced by packages. A new gig waits for an admin to check
            it.
          </p>
        </div>
        <Link href="/seller/gigs/new" className={management.addButton}>
          + Create gig
        </Link>
      </div>

      <div className={management.toolbar}>
        <div className={management.toolbarLeft}>
          <input
            className={management.searchInput}
            type="search"
            aria-label="Search gigs"
            placeholder="Search title, Bangla title or package code"
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
            aria-label="Filter by price type"
            value={priceType}
            onChange={(event) => setPriceType(event.target.value)}
          >
            <option value="">All price types</option>
            {PRICE_TYPE_OPTIONS.map((opt) => (
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
          {anyFilter && (
            <button
              type="button"
              className={management.actionButton}
              onClick={() => {
                setSearch("");
                setStatus("");
                setPriceType("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <p className={management.errorBanner}>{error}</p>}

      <div className={management.tableWrap}>
        <table className={management.table}>
          <thead>
            <tr>
              <th></th>
              <th>Gig</th>
              <th>Category</th>
              <th>From</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={management.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className={management.stateRow}>
                  {anyFilter ? (
                    "No gigs match these filters."
                  ) : (
                    <>
                      You have no gigs yet. <Link href="/seller/gigs/new">Create your first gig</Link>.
                    </>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <RowThumbnail url={item.image_url} />
                  </td>
                  <td>
                    <Link href={`/seller/gigs/${item.id}`} className={management.primaryText}>
                      {item.title}
                    </Link>
                    {item.title_bn && <div className={management.secondaryText}>{item.title_bn}</div>}
                  </td>
                  <td className={management.secondaryText}>{categoryName(item.category)}</td>
                  <td>
                    <RateDisplay
                      price={item.price}
                      discountedPrice={item.discounted_price}
                      priceType={item.price_type}
                      from
                    />
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
                      <Link href={`/seller/gigs/${item.id}`} className={management.actionButton}>
                        View
                      </Link>
                      <Link href={`/seller/gigs/${item.id}/edit`} className={management.actionButton}>
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
