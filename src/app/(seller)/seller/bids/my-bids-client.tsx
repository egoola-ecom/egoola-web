"use client";

import { useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import {
  BID_STATUS_OPTIONS,
  bidStatusBadgeClass,
  bidStatusLabel,
  jobStatusLabel,
  tierText,
} from "@/app/(admin)/admin/(protected)/jobs/job-utils";
import { SellerBid, listMyBids } from "@/lib/seller-job-api";
import { useCursorList } from "@/lib/use-cursor-list";
import shell from "../../seller-shell.module.css";
import { useListingFailure } from "../listings/listing-status";
import { LoadMore } from "../jobs/load-more";

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "-updated_at", label: "Recently changed" },
];

/** "My bids": every bid the seller placed, any status, one row each (a job
 * bid on twice shows twice). Cursor paged. */
export function MyBidsClient() {
  const fail = useListingFailure();
  const [status, setStatus] = useState("");
  const [ordering, setOrdering] = useState("-created_at");

  const { items, loading, loadingMore, error, hasMore, loadMore } = useCursorList<SellerBid>(
    listMyBids,
    "",
    { status, ordering },
    20,
    fail,
  );

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={shell.pageTitle}>My bids</h1>
          <p className={shell.pageText} style={{ marginBottom: 0 }}>
            Every bid you have placed, whether it won or not.
          </p>
        </div>
      </div>

      <div className={management.toolbar}>
        <div className={management.toolbarLeft}>
          <select
            className={management.filterSelect}
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {BID_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={management.filterSelect}
            aria-label="Sort bids"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className={management.errorBanner}>{error}</p>}

      <div className={management.tableWrap}>
        <table className={management.table}>
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>My quote</th>
              <th>Placed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={management.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className={management.stateRow}>
                  {status ? (
                    "No bids with this status."
                  ) : (
                    <>
                      You have not placed a bid yet. <Link href="/seller/jobs">Browse the job board</Link>.
                    </>
                  )}
                </td>
              </tr>
            ) : (
              items.map((bid) => (
                <tr key={bid.id}>
                  <td>
                    <Link href={`/seller/jobs/${bid.job.id}`} className={management.primaryText}>
                      {bid.job.title}
                    </Link>
                    <div className={management.secondaryText}>Job: {jobStatusLabel(bid.job.status)}</div>
                  </td>
                  <td>
                    <span className={`${management.badge} ${bidStatusBadgeClass(bid.status)}`}>
                      {bidStatusLabel(bid.status)}
                    </span>
                  </td>
                  <td className={management.secondaryText}>
                    {bid.price_tiers.map((t) => tierText(t.price, t.price_type)).join(" · ")}
                  </td>
                  <td className={management.secondaryText}>{formatDateTime(bid.created_at)}</td>
                  <td>
                    <div className={management.rowActions}>
                      <Link href={`/seller/bids/${bid.id}`} className={management.actionButton}>
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
