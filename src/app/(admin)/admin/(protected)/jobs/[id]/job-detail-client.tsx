"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BidListItem, listBids } from "@/lib/admin-bids-api";
import { JobDetail, JobStatus, getJob, updateJob } from "@/lib/admin-jobs-api";
import { AuthError, clearSession } from "@/lib/auth";
import { describeLoadError } from "@/lib/load-error";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { Modal } from "@/components/modal";
import { ReadonlyField } from "../../_shared/readonly-field";
import { useResolvedLocation } from "../../_shared/use-resolved-location";
import { formatDateTime } from "../../catalog/listings/listing-utils";
import {
  JOB_MOVES,
  JOB_STATUS_OPTIONS,
  bidStatusBadgeClass,
  bidStatusLabel,
  jobIsEditable,
  jobStatusBadgeClass,
  jobStatusLabel,
  moveBlockedReason,
  tierText,
} from "../job-utils";
import styles from "../../management.module.css";

const MOVE_LABELS: Record<JobStatus, string> = {
  open_for_bidding: "Reopen for bidding",
  draft: "Pause (draft)",
  pending: "Move to pending",
  in_progress: "In progress",
  completed: "Mark complete",
  cancelled: "Cancel job",
};

export function JobDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bids, setBids] = useState<BidListItem[] | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadError(null);
    getJob(id)
      .then((detail) => {
        if (!cancelled) setJob(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setLoadError(
          describeLoadError(
            err,
            "This job was not found. It may be a product or a gig (those are under Listing).",
            "Couldn't load this job. Please try again.",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    listBids(new URLSearchParams({ listing: String(id), limit: "50" }))
      .then((res) => {
        if (!cancelled) setBids(res.results);
      })
      .catch(() => {
        if (!cancelled) setBids([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reload]);

  const location = useResolvedLocation({
    country: job?.location.country ?? null,
    state: job?.location.state ?? null,
    city: job?.location.city ?? null,
    thana: job?.location.thana ?? null,
  });

  async function move(to: JobStatus, note?: string) {
    setMoving(true);
    setMoveError(null);
    setReasonError(null);
    try {
      const body: Parameters<typeof updateJob>[1] = { status: to };
      if (note) body.note = note;
      await updateJob(id, body);
      setCancelling(false);
      setReason("");
      setReload((n) => n + 1);
    } catch (err) {
      if (handleAuthError(err)) return;
      const { fieldErrors, message }: { fieldErrors: FieldErrors; message: string | null } =
        parseFieldErrors(err);
      const text =
        fieldErrors.note?.[0] ?? fieldErrors.status?.[0] ?? fieldErrors.detail?.[0] ?? message ?? "Couldn't change the status.";
      if (cancelling) setReasonError(text);
      else setMoveError(text);
    } finally {
      setMoving(false);
    }
  }

  function startMove(to: JobStatus) {
    if (!job) return;
    if (to === "cancelled") {
      setReason("");
      setReasonError(null);
      setCancelling(true);
    } else if (window.confirm(`${MOVE_LABELS[to]}?`)) {
      void move(to);
    }
  }

  function submitCancel(event: React.FormEvent) {
    event.preventDefault();
    if (!job) return;
    const text = reason.trim();
    // A hired job needs a reason; any other cancel may leave it out.
    if (job.status === "in_progress" && text === "") {
      setReasonError("A reason is required to cancel a hired job.");
      return;
    }
    void move("cancelled", text || undefined);
  }

  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !job) {
    return (
      <div>
        <button type="button" className={styles.backLink} onClick={() => router.push("/admin/jobs")}>
          ← Back to Jobs
        </button>
        <p className={styles.errorBanner}>{loadError ?? "Job not found."}</p>
      </div>
    );
  }

  const allowed = JOB_MOVES[job.status];
  const hiredBid = bids?.find((b) => b.status === "accepted" || b.status === "completed");
  const accepted = typeof job.accepted_bid === "object" ? job.accepted_bid : null;
  const acceptedId = accepted?.id ?? (typeof job.accepted_bid === "number" ? job.accepted_bid : hiredBid?.id);

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/jobs")}>
        ← Back to Jobs
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>{job.title}</h1>
          {job.title_bn && <p className={styles.subtitle}>{job.title_bn}</p>}
          <p className={styles.subtitle}>Job · a buyer&apos;s request for work</p>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.badge} ${jobStatusBadgeClass(job.status)}`}>
              {jobStatusLabel(job.status)}
            </span>
            {job.urgent ? <span className={`${styles.badge} ${styles.badgeAmber}`}>Urgent</span> : null}
            {job.budget && (
              <span className={styles.primaryText}>
                Budget from {tierText(job.budget.price, job.budget.price_type)}
              </span>
            )}
          </div>
        </div>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.addButton}
            disabled={!jobIsEditable(job.status)}
            title={
              jobIsEditable(job.status)
                ? undefined
                : "A hired, completed or cancelled job cannot be edited. Use the status actions."
            }
            onClick={() => router.push(`/admin/jobs/${id}/edit`)}
          >
            Update
          </button>
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Status</h2>
        <p className={styles.fieldHint}>
          Only the moves that are valid from {jobStatusLabel(job.status)} can be pressed. A job is
          hired by accepting one of its bids, and a hired job can be completed or, by an admin,
          cancelled with a reason.
        </p>
        {moveError && <p className={styles.errorBanner}>{moveError}</p>}
        <div className={styles.rowActions}>
          {JOB_STATUS_OPTIONS.filter((opt) => opt.value !== job.status && opt.value !== "in_progress").map(
            (opt) => {
              const ok = allowed.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.actionButton} ${opt.value === "cancelled" ? styles.actionButtonDanger : ""}`}
                  disabled={!ok || moving}
                  title={ok ? undefined : moveBlockedReason(job.status, opt.value)}
                  onClick={() => startMove(opt.value)}
                >
                  {MOVE_LABELS[opt.value]}
                </button>
              );
            },
          )}
        </div>
        {job.note && (
          <p className={styles.fieldHint}>
            Last note: <strong>{job.note}</strong>
          </p>
        )}
      </div>

      {acceptedId != null && (
        <div className={styles.detailCard}>
          <h2 className={styles.detailCardTitle}>Hired bid</h2>
          <p>
            <Link href={`/admin/bidding/${acceptedId}`}>
              Bid #{acceptedId}
              {hiredBid ? ` · ${hiredBid.bidder.name}` : accepted?.bidder ? ` · ${accepted.bidder.name}` : ""}
            </Link>
          </p>
        </div>
      )}

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Overview</h2>
        <div className={styles.formGrid}>
          <ReadonlyField label="Buyer" value={`${job.buyer.name} · ${job.buyer.phone} · ${job.buyer.email}`} />
          <ReadonlyField label="Category" value={job.category.name} />
          <div className={styles.formGridFull}>
            <ReadonlyField label="Description" value={job.description} />
          </div>
          {job.description_bn && (
            <div className={styles.formGridFull}>
              <ReadonlyField label="Description (Bangla)" value={job.description_bn} />
            </div>
          )}
          {job.package_includes && (
            <div className={styles.formGridFull}>
              <ReadonlyField label="What the job includes" value={job.package_includes} />
            </div>
          )}
          <ReadonlyField label="Delivery days" value={job.delivery_days != null ? String(job.delivery_days) : "—"} />
          <ReadonlyField label="Needed from" value={job.available_from ? formatDateTime(job.available_from) : "—"} />
          <ReadonlyField label="Needed until" value={job.available_to ? formatDateTime(job.available_to) : "—"} />
          <ReadonlyField label="Location" value={location || "—"} />
          <ReadonlyField label="Posted" value={formatDateTime(job.created_at)} />
          <ReadonlyField label="Last changed" value={formatDateTime(job.updated_at)} />
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Budget</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Price type</th>
                <th>Price</th>
                <th>Note</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {job.skus.map((sku) => (
                <tr key={sku.id}>
                  <td>{sku.price_type}</td>
                  <td className={styles.primaryText}>{tierText(sku.price, sku.price_type)}</td>
                  <td className={styles.secondaryText}>{sku.description ?? "—"}</td>
                  <td>{sku.is_active ? "Active" : "Hidden"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>
          Bids ({job.bid_count}){" "}
          <Link href={`/admin/bidding?listing=${id}`} className={styles.secondaryText}>
            Open in Bidding
          </Link>
        </h2>
        {bids == null ? (
          <p className={styles.stateRow}>Loading…</p>
        ) : bids.length === 0 ? (
          <p className={styles.stateRow}>No bids on this job yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Status</th>
                  <th>Quote</th>
                  <th>Placed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => (
                  <tr key={bid.id}>
                    <td>{bid.bidder.name}</td>
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
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/bidding/${bid.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {bids != null && job.bid_count > bids.length && (
          <p className={styles.fieldHint}>
            Showing the latest {bids.length} of {job.bid_count} bids.{" "}
            <Link href={`/admin/bidding?listing=${id}`}>See all of them in Bidding</Link>.
          </p>
        )}
        {job.status === "open_for_bidding" && (
          <p>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => router.push(`/admin/bidding/new?listing=${id}`)}
            >
              + Add a bid for a seller
            </button>
          </p>
        )}
      </div>

      {cancelling && (
        <Modal title="Cancel this job" onClose={() => !moving && setCancelling(false)}>
          <form onSubmit={submitCancel}>
            <p className={styles.fieldHint}>
              Every live bid on this job is cancelled
              {job.status === "in_progress" ? ", and the hired bid's order is cancelled too" : ""}. This
              cannot be undone.
              {job.status === "in_progress" ? " A reason is required." : ""}
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="job-cancel-reason">
                Reason{job.status === "in_progress" ? " (required)" : " (optional)"}
              </label>
              <textarea
                id="job-cancel-reason"
                className={styles.textarea}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              {reasonError && <p className={styles.fieldError}>{reasonError}</p>}
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setCancelling(false)} disabled={moving}>
                Keep job
              </button>
              <button type="submit" className={styles.dangerButton} disabled={moving}>
                {moving ? "Cancelling…" : "Cancel job"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
