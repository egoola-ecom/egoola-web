"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JobListItem, listJobs } from "@/lib/admin-jobs-api";
import { CategoryTreeNode, getCategoryTree } from "@/lib/category-api";
import { useDebounced } from "@/lib/use-debounced";
import { useManagedList } from "@/lib/use-managed-list";
import { PersonPicker } from "../_shared/person-picker";
import { formatDateTime } from "../catalog/listings/listing-utils";
import { JOB_STATUS_OPTIONS, jobStatusBadgeClass, jobStatusLabel, tierText } from "./job-utils";
import styles from "../management.module.css";

function flatten(nodes: CategoryTreeNode[], depth = 0): { id: number; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"  ".repeat(depth)}${node.name}` },
    ...flatten(node.children, depth + 1),
  ]);
}

/** Jobs: every buyer's request for work, page by page. A job is never
 * reviewed — it is live when posted — so the list is about who asked, what
 * the budget is and how many bids it has. `buyer` can come from a link. */
export function JobsClient({ buyer, initialStatus }: { buyer?: string; initialStatus?: string }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState(
    JOB_STATUS_OPTIONS.some((opt) => opt.value === initialStatus) ? (initialStatus as string) : "",
  );
  const [category, setCategory] = useState("");
  const [buyerId, setBuyerId] = useState<number | null>(buyer && Number(buyer) > 0 ? Number(buyer) : null);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; label: string }[]>([]);
  const search = useDebounced(searchText.trim(), 300);

  const { items, count, loading, error, offset, setOffset, pageSize } = useManagedList<JobListItem>(
    listJobs,
    search,
    {
      status: status || undefined,
      category: category || undefined,
      buyer: buyerId != null ? String(buyerId) : undefined,
      created_from: createdFrom || undefined,
      created_to: createdTo || undefined,
    },
  );

  useEffect(() => {
    getCategoryTree({ type: "service" })
      .then((tree) => setCategoryOptions(flatten(tree)))
      .catch(() => setCategoryOptions([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Jobs</h1>
          <p className={styles.subtitle}>
            Work buyers ask for. Sellers bid on a job and one bid is accepted to hire them. Create
            or change a job on a buyer&apos;s behalf, or cancel a hired one.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search jobs"
            placeholder="Search title, description, buyer name or phone"
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
            {JOB_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => router.push(buyerId != null ? `/admin/jobs/new?buyer=${buyerId}` : "/admin/jobs/new")}
        >
          + Add Job
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div style={{ minWidth: "16rem" }}>
            <PersonPicker
              kind="buyer"
              inputId="jobs-buyer-filter"
              label="Buyer"
              value={buyerId}
              onChange={setBuyerId}
            />
          </div>
          <label className={styles.secondaryText}>
            Created from{" "}
            <input
              type="date"
              className={styles.filterSelect}
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
            />
          </label>
          <label className={styles.secondaryText}>
            Created to{" "}
            <input
              type="date"
              className={styles.filterSelect}
              value={createdTo}
              onChange={(event) => setCreatedTo(event.target.value)}
            />
          </label>
        </div>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Buyer</th>
              <th>Status</th>
              <th>Budget</th>
              <th>Bids</th>
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
                  No jobs match.
                </td>
              </tr>
            ) : (
              items.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className={styles.primaryText}>
                      {job.title}
                      {job.urgent ? (
                        <>
                          {" "}
                          <span className={`${styles.badge} ${styles.badgeAmber}`}>Urgent</span>
                        </>
                      ) : null}
                    </div>
                    <div className={styles.secondaryText}>{job.category.name}</div>
                  </td>
                  <td>
                    <div className={styles.primaryText}>{job.buyer.name}</div>
                    <div className={styles.secondaryText}>{job.buyer.phone}</div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${jobStatusBadgeClass(job.status)}`}>
                      {jobStatusLabel(job.status)}
                    </span>
                  </td>
                  <td>
                    {job.budget ? (
                      <span className={styles.primaryText}>
                        {tierText(job.budget.price, job.budget.price_type)}
                      </span>
                    ) : (
                      <span className={styles.secondaryText}>No active budget</span>
                    )}
                  </td>
                  <td>{job.bid_count}</td>
                  <td className={styles.secondaryText}>{formatDateTime(job.created_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/jobs/${job.id}`)}
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
