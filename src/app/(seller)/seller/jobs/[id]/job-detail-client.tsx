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
  tierText,
} from "@/app/(admin)/admin/(protected)/jobs/job-utils";
import { describeLoadError } from "@/lib/load-error";
import { SellerJobDetail, bidIsLive, getSellerJob, hiredTierId } from "@/lib/seller-job-api";
import shell from "../../../seller-shell.module.css";
import { useSeller } from "../../seller-context";
import { BidTierTable } from "../../bids/bid-tier-table";

/** Why the seller cannot place a bid here, or null when they can. */
function bidBlockedReason(job: SellerJobDetail): string | null {
  if (job.status !== "open_for_bidding") {
    return `This job is ${jobStatusLabel(job.status).toLowerCase()}, so it is not taking bids.`;
  }
  if (job.my_bids.some(bidIsLive)) {
    return "You already have a live bid on this job. Cancel it first if you want to bid again.";
  }
  return null;
}

export function SellerJobDetailClient({ id }: { id: number }) {
  const { handleAuthError } = useSeller();
  const [job, setJob] = useState<SellerJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSellerJob(id)
      .then((detail) => {
        if (!cancelled) setJob(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setLoadError(
          describeLoadError(err, "This job was not found.", "Couldn't load this job. Please try again."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, handleAuthError]);

  if (loading) return <p className={management.stateRow}>Loading…</p>;
  if (loadError || !job) {
    return (
      <div>
        <Link href="/seller/jobs" className={management.backLink}>
          ← Back to the job board
        </Link>
        <p className={management.errorBanner}>{loadError ?? "Job not found."}</p>
      </div>
    );
  }

  const blocked = bidBlockedReason(job);
  const place = [
    job.location.thana,
    job.location.city,
    job.location.state,
    job.location.country,
  ]
    .filter((p) => p != null)
    .map((p) => p.name)
    .join(", ");

  return (
    <div>
      <Link href="/seller/jobs" className={management.backLink}>
        ← Back to the job board
      </Link>

      <div className={management.detailHeader}>
        <div className={management.detailHeaderInfo}>
          <h1 className={shell.pageTitle}>{job.title}</h1>
          {job.title_bn && <p className={management.subtitle}>{job.title_bn}</p>}
          <div className={management.detailBadgeRow}>
            <span className={`${management.badge} ${jobStatusBadgeClass(job.status)}`}>
              {jobStatusLabel(job.status)}
            </span>
            {job.urgent && <span className={`${management.badge} ${management.badgeRed}`}>Urgent</span>}
            <span className={management.secondaryText}>{job.category.name}</span>
          </div>
        </div>
        <div className={management.rowActions}>
          {blocked == null && (
            <Link href={`/seller/jobs/${job.id}/bid`} className={management.addButton}>
              Place a bid
            </Link>
          )}
        </div>
      </div>

      {blocked && (
        <p className={management.noticeBanner} role="status">
          {blocked}
        </p>
      )}

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>The job</h2>
        <div className={management.formGrid}>
          <ReadonlyField
            label="Budget"
            value={job.budget ? tierText(job.budget.price, job.budget.price_type) : "—"}
          />
          <ReadonlyField
            label="Delivery"
            value={job.delivery_days != null ? `${job.delivery_days} ${job.delivery_days === 1 ? "day" : "days"}` : "—"}
          />
          <div className={management.formGridFull}>
            <ReadonlyField label="Description" value={job.description || "—"} />
          </div>
          {job.package_includes && (
            <div className={management.formGridFull}>
              <ReadonlyField label="What is included" value={job.package_includes} />
            </div>
          )}
          <ReadonlyField label="Needed from" value={job.available_from ? formatDateTime(job.available_from) : "—"} />
          <ReadonlyField label="Needed until" value={job.available_to ? formatDateTime(job.available_to) : "—"} />
          <ReadonlyField label="Where" value={place || "—"} />
          <ReadonlyField label="Bids so far" value={String(job.bid_count)} />
          <ReadonlyField label="Posted" value={formatDateTime(job.created_at)} />
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>
          Your bids on this job ({job.my_bids.length})
        </h2>
        {job.my_bids.length === 0 ? (
          <p className={management.fieldHint}>You have not bid on this job.</p>
        ) : (
          job.my_bids.map((bid) => (
            <div key={bid.id} style={{ marginBottom: "1.25rem" }}>
              <div className={management.detailBadgeRow}>
                <strong>Bid #{bid.id}</strong>
                <span className={`${management.badge} ${bidStatusBadgeClass(bid.status)}`}>
                  {bidStatusLabel(bid.status)}
                </span>
                <span className={management.secondaryText}>placed {formatDateTime(bid.created_at)}</span>
                <Link href={`/seller/bids/${bid.id}`} className={management.actionButton}>
                  Open bid
                </Link>
              </div>
              {bid.description && <p>{bid.description}</p>}
              <BidTierTable tiers={bid.price_tiers} hiredId={hiredTierId(bid)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
