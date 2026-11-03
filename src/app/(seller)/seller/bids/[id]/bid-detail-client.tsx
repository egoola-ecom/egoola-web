"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { ReadonlyField } from "@/app/(admin)/admin/(protected)/_shared/readonly-field";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import {
  bidStatusBadgeClass,
  bidStatusLabel,
  jobStatusBadgeClass,
  jobStatusLabel,
} from "@/app/(admin)/admin/(protected)/jobs/job-utils";
import { Modal } from "@/components/modal";
import { describeLoadError } from "@/lib/load-error";
import { SellerBidDetail, cancelMyBid, getMyBid, hiredTierId } from "@/lib/seller-job-api";
import { parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { useListingFailure } from "../../listings/listing-status";
import { useSeller } from "../../seller-context";
import { BidTierTable } from "../bid-tier-table";

const NOTICES: Record<string, string> = {
  placed: "Bid placed. The buyer will see it and may hire you.",
  saved: "Bid changes saved.",
};

function errorText(err: unknown): string {
  const { fieldErrors, message } = parseFieldErrors(err);
  return (
    fieldErrors.status?.[0] ??
    fieldErrors.detail?.[0] ??
    fieldErrors["0"]?.[0] ??
    Object.values(fieldErrors)[0]?.[0] ??
    message ??
    "Something went wrong."
  );
}

/** What the seller needs to know about where the bid stands. */
function standing(bid: SellerBidDetail): string | null {
  switch (bid.status) {
    case "pending":
      return "Waiting for the buyer. You can still change the price or cancel the bid.";
    case "accepted":
      return "You were hired for this job.";
    case "completed":
      return "This job is done.";
    case "rejected":
      return "The buyer did not pick this bid.";
    case "cancelled":
      return "You cancelled this bid.";
    default:
      return null;
  }
}

export function MyBidDetailClient({ id, notice }: { id: number; notice: string | null }) {
  const fail = useListingFailure();
  const { handleAuthError } = useSeller();
  const [bid, setBid] = useState<SellerBidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyBid(id)
      .then((detail) => {
        if (!cancelled) setBid(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setLoadError(
          describeLoadError(err, "This bid was not found.", "Couldn't load this bid. Please try again."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, handleAuthError]);

  async function cancelBid(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setDialogError(null);
    try {
      setBid(await cancelMyBid(id));
      setConfirming(false);
    } catch (err) {
      if (fail(err) != null) setDialogError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className={management.stateRow}>Loading…</p>;
  if (loadError || !bid) {
    return (
      <div>
        <Link href="/seller/bids" className={management.backLink}>
          ← Back to my bids
        </Link>
        <p className={management.errorBanner}>{loadError ?? "Bid not found."}</p>
      </div>
    );
  }

  const pending = bid.status === "pending";
  const text = standing(bid);

  return (
    <div>
      <Link href="/seller/bids" className={management.backLink}>
        ← Back to my bids
      </Link>

      <div className={management.detailHeader}>
        <div className={management.detailHeaderInfo}>
          <h1 className={shell.pageTitle}>Bid #{bid.id}</h1>
          <p className={management.subtitle}>
            on <Link href={`/seller/jobs/${bid.job.id}`}>{bid.job.title}</Link>
          </p>
          <div className={management.detailBadgeRow}>
            <span className={`${management.badge} ${bidStatusBadgeClass(bid.status)}`}>
              {bidStatusLabel(bid.status)}
            </span>
            <span className={`${management.badge} ${jobStatusBadgeClass(bid.job.status)}`}>
              Job: {jobStatusLabel(bid.job.status)}
            </span>
          </div>
        </div>
        <div className={management.rowActions}>
          {pending && (
            <>
              <Link href={`/seller/bids/${id}/edit`} className={management.actionButton}>
                Edit bid
              </Link>
              <button
                type="button"
                className={`${management.actionButton} ${management.actionButtonDanger}`}
                onClick={() => {
                  setDialogError(null);
                  setConfirming(true);
                }}
              >
                Cancel bid
              </button>
            </>
          )}
          {(bid.status === "cancelled" || bid.status === "rejected") &&
            bid.job.status === "open_for_bidding" && (
              <Link href={`/seller/jobs/${bid.job.id}`} className={management.actionButton}>
                Open the job to bid again
              </Link>
            )}
        </div>
      </div>

      {notice && NOTICES[notice] && (
        <p className={management.noticeBanner} role="status">
          {NOTICES[notice]}
        </p>
      )}
      {text && (
        <p className={management.noticeBanner} role="status">
          {text}
        </p>
      )}

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Bid</h2>
        <div className={management.formGrid}>
          <div className={management.formGridFull}>
            <ReadonlyField label="Your message" value={bid.description ?? "—"} />
          </div>
          <ReadonlyField label="Proposed start" value={bid.proposed_start ? formatDateTime(bid.proposed_start) : "—"} />
          <ReadonlyField label="Proposed end" value={bid.proposed_end ? formatDateTime(bid.proposed_end) : "—"} />
          <ReadonlyField label="Actual start" value={bid.actual_start_date ? formatDateTime(bid.actual_start_date) : "—"} />
          <ReadonlyField label="Actual end" value={bid.actual_end_date ? formatDateTime(bid.actual_end_date) : "—"} />
          <ReadonlyField label="Placed" value={formatDateTime(bid.created_at)} />
          <ReadonlyField label="Last changed" value={formatDateTime(bid.updated_at)} />
          {bid.note && (
            <div className={management.formGridFull}>
              <ReadonlyField label="Note" value={bid.note} />
            </div>
          )}
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Price options</h2>
        <BidTierTable tiers={bid.price_tiers} hiredId={hiredTierId(bid)} />
      </div>

      {confirming && (
        <Modal title="Cancel this bid" onClose={() => !busy && setConfirming(false)}>
          <form onSubmit={cancelBid}>
            <p className={management.fieldHint}>
              The bid is withdrawn. You can place a new bid on this job afterwards if it is still open.
            </p>
            {dialogError && <p className={management.fieldError}>{dialogError}</p>}
            <div className={management.formActions}>
              <button
                type="button"
                className={management.cancelButton}
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Keep bid
              </button>
              <button type="submit" className={management.dangerButton} disabled={busy}>
                {busy ? "Cancelling…" : "Cancel bid"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
