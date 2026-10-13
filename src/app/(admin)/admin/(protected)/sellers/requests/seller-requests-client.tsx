"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SellerListItem,
  SellerRequestOrdering,
  listSellerRequests,
} from "@/lib/accounts-api";
import { resolveMediaUrl } from "@/lib/env";
import { useSellerRequestCount } from "@/lib/seller-request-count";
import { useCursorList } from "@/lib/use-cursor-list";
import {
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  initials,
  statusBadgeClass,
  verificationBadgeClass,
} from "../seller-badges";
import { SellerFilterBar, useSellerFilters } from "../seller-filters";
import styles from "../../management.module.css";

const SORT_OPTIONS: { value: SellerRequestOrdering; label: string }[] = [
  { value: "-requested_at", label: "Newest request" },
  { value: "requested_at", label: "Oldest request" },
  { value: "name", label: "Name A to Z" },
  { value: "-name", label: "Name Z to A" },
];

/** Self-registered sellers nobody has acted on yet. A cursor-paged queue:
 * "Load more" follows the server's `next` link; there is no total or page
 * numbers. The number in the heading is the menu badge's count. */
export function SellerRequestsClient() {
  const router = useRouter();
  const f = useSellerFilters();
  const [ordering, setOrdering] = useState<SellerRequestOrdering>("-requested_at");
  const waiting = useSellerRequestCount(true);

  const { items, loading, loadingMore, error, hasMore, loadMore } =
    useCursorList<SellerListItem>(listSellerRequests, f.search, {
      ...f.filters,
      ordering,
    });

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/sellers")}>
        ← Back to Sellers
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>
            Seller Requests{waiting != null ? ` (${waiting})` : ""}
          </h1>
          <p className={styles.subtitle}>
            Sellers who signed up themselves and are waiting for an admin. Open a request to
            check the documents, then approve or reject it.
          </p>
        </div>
      </div>

      <SellerFilterBar
        f={f}
        idPrefix="request-filter"
        showCreatorType={false}
        dateKind="requested"
        trailing={
          <div className={styles.toolbarLeft}>
            <select
              className={styles.filterSelect}
              aria-label="Sort requests"
              value={ordering}
              onChange={(event) => setOrdering(event.target.value as SellerRequestOrdering)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Seller</th>
              <th>Phone</th>
              <th>Verification</th>
              <th>Status</th>
              <th>Requested</th>
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
                  {f.active
                    ? "No requests match these filters."
                    : "No requests are waiting. New sign-ups appear here."}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.avatar}>
                        {item.profile_pic_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveMediaUrl(item.profile_pic_url) ?? undefined} alt="" />
                        ) : (
                          initials(item.name)
                        )}
                      </span>
                      <div>
                        <div className={styles.primaryText}>
                          {item.name}
                          {item.verification_status === "pending" && (
                            <span
                              className={`${styles.badge} ${styles.badgeAmber}`}
                              style={{ marginLeft: "0.5rem" }}
                              title="A rejected seller fixed their application and sent it again."
                            >
                              Resubmitted
                            </span>
                          )}
                        </div>
                        <div className={styles.secondaryText}>{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{item.phone}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${verificationBadgeClass(item.verification_status)}`}
                    >
                      {item.verification_status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${statusBadgeClass(item.status)}`}
                      title={STATUS_LABELS[item.status]}
                    >
                      {STATUS_SHORT_LABELS[item.status]}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>
                    {new Date(item.requested_at ?? item.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/sellers/${item.id}?from=requests`)}
                      >
                        Review
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
            : `${items.length} request${items.length === 1 ? "" : "s"} shown${hasMore ? " — more available" : ""}`}
        </span>
        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={!hasMore || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? "Loading…" : hasMore ? "Load more" : "No more requests"}
          </button>
        </div>
      </div>
    </div>
  );
}
