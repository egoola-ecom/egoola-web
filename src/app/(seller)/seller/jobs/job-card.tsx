import Link from "next/link";
import type { SellerJobCard } from "@/lib/seller-job-api";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import {
  jobStatusBadgeClass,
  jobStatusLabel,
  tierText,
} from "@/app/(admin)/admin/(protected)/jobs/job-utils";

/** One row of the job board or of "My jobs": the title, the budget, how soon
 * it must be done, how many bids it has and how many of them are the seller's
 * own. */
export function JobTable({
  jobs,
  loading,
  emptyText,
  showStatus,
}: {
  jobs: SellerJobCard[];
  loading: boolean;
  emptyText: React.ReactNode;
  /** The board only lists open jobs, so it needs no status column. */
  showStatus: boolean;
}) {
  const cols = showStatus ? 6 : 5;
  return (
    <div className={management.tableWrap}>
      <table className={management.table}>
        <thead>
          <tr>
            <th>Job</th>
            <th>Budget</th>
            <th>Delivery</th>
            {showStatus && <th>Status</th>}
            <th>Bids</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={cols} className={management.stateRow}>
                Loading…
              </td>
            </tr>
          ) : jobs.length === 0 ? (
            <tr>
              <td colSpan={cols} className={management.stateRow}>
                {emptyText}
              </td>
            </tr>
          ) : (
            jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/seller/jobs/${job.id}`} className={management.primaryText}>
                    {job.title}
                  </Link>
                  {job.title_bn && <div className={management.secondaryText}>{job.title_bn}</div>}
                  <div className={management.secondaryText}>
                    {job.category.name} · posted {formatDateTime(job.created_at)}
                  </div>
                </td>
                <td className={management.primaryText}>
                  {job.budget ? tierText(job.budget.price, job.budget.price_type) : "—"}
                </td>
                <td>
                  {job.delivery_days != null ? (
                    <span className={management.secondaryText}>
                      {job.delivery_days} {job.delivery_days === 1 ? "day" : "days"}
                    </span>
                  ) : (
                    "—"
                  )}
                  {job.urgent && (
                    <>
                      {" "}
                      <span className={`${management.badge} ${management.badgeRed}`}>Urgent</span>
                    </>
                  )}
                </td>
                {showStatus && (
                  <td>
                    <span className={`${management.badge} ${jobStatusBadgeClass(job.status)}`}>
                      {jobStatusLabel(job.status)}
                    </span>
                  </td>
                )}
                <td>
                  <div className={management.secondaryText}>
                    {job.bid_count} {job.bid_count === 1 ? "bid" : "bids"}
                  </div>
                  {job.my_bid_count > 0 && (
                    <span className={`${management.badge} ${management.badgeBlue}`}>
                      You bid {job.my_bid_count} {job.my_bid_count === 1 ? "time" : "times"}
                    </span>
                  )}
                </td>
                <td>
                  <div className={management.rowActions}>
                    <Link href={`/seller/jobs/${job.id}`} className={management.actionButton}>
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
  );
}
