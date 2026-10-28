"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BidListItem, BidOrdering, listBids } from "@/lib/admin-bids-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { PersonPicker } from "../_shared/person-picker";
import { formatDateTime } from "../catalog/listings/listing-utils";
import { BID_STATUS_OPTIONS, bidStatusBadgeClass, bidStatusLabel, tierText } from "../jobs/job-utils";
import styles from "../management.module.css";

const SORT_OPTIONS: { value: BidOrdering; label: string }[] = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "-updated_at", label: "Recently changed" },
  { value: "updated_at", label: "Least recently changed" },
];

/** Every bid on every job, cursor paged ("Load more"). `listing` (a job id)
 * and `bidder` (a seller id) come from the link that opened the page, such
 * as a job's page, and narrow the list; the seller can also be picked here. */
export function BidsClient({
  listing,
  bidder,
  initialStatus,
}: {
  listing?: string;
  bidder?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(
    BID_STATUS_OPTIONS.some((opt) => opt.value === initialStatus) ? (initialStatus as string) : "",
  );
  const [sellerId, setSellerId] = useState<number | null>(bidder && Number(bidder) > 0 ? Number(bidder) : null);
  const [ordering, setOrdering] = useState<BidOrdering>("-created_at");

  const { items, loading, loadingMore, error, hasMore, loadMore } = useCursorList<BidListItem>(
    listBids,
    "",
    {
      status,
      listing,
      bidder: sellerId != null ? String(sellerId) : undefined,
      ordering,
    },
  );

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Bidding</h1>
          <p className={styles.subtitle}>
            Sellers&apos; offers on buyers&apos; jobs. Place or change a bid for a seller, hire a
            bidder on the buyer&apos;s behalf, or undo a hire.
          </p>
        </div>
      </div>

      {listing && (
        <p className={styles.fieldHint}>
          Showing only the bids on job #{listing}.{" "}
          <Link href={`/admin/jobs/${listing}`}>Open the job</Link>{" "}
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => router.push(sellerId != null ? `/admin/bidding?bidder=${sellerId}` : "/admin/bidding")}
          >
            Show all bids
          </button>
        </p>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <select
            className={styles.filterSelect}
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
          <div style={{ minWidth: "16rem" }}>
            <PersonPicker
              kind="seller"
              inputId="bids-seller-filter"
              label="Seller"
              value={sellerId}
              onChange={setSellerId}
            />
          </div>
          <select
            className={styles.filterSelect}
            aria-label="Sort bids"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value as BidOrdering)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            const q = new URLSearchParams();
            if (listing) q.set("listing", listing);
            if (sellerId != null) q.set("bidder", String(sellerId));
            router.push(`/admin/bidding/new${q.size ? `?${q}` : ""}`);
          }}
        >
          + Add Bid
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Job</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Quote</th>
              <th>Placed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.stateRow}>
                  No bids match.
                </td>
              </tr>
            ) : (
              items.map((bid) => (
                <tr key={bid.id}>
                  <td>
                    <div className={styles.primaryText}>
                      <Link href={`/admin/jobs/${bid.job.id}`}>{bid.job.title}</Link>
                    </div>
                  </td>
                  <td>
                    <div className={styles.primaryText}>{bid.bidder.name}</div>
                    <div className={styles.secondaryText}>{bid.bidder.phone}</div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${bidStatusBadgeClass(bid.status)}`}>
                      {bidStatusLabel(bid.status)}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>
                    {bid.price_tiers.map((t) => tierText(t.total_price, t.price_type)).join(" · ")}
                  </td>
                  <td className={styles.secondaryText}>{formatDateTime(bid.created_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/bidding/${bid.id}`)}
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>{items.length} shown</span>
          <div className={styles.pageButtons}>
            <button type="button" className={styles.pageButton} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
