"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { BidForm } from "@/app/(admin)/admin/(protected)/bidding/bid-form";
import { tierText } from "@/app/(admin)/admin/(protected)/jobs/job-utils";
import { describeLoadError } from "@/lib/load-error";
import { SellerBidInput, SellerJobDetail, bidIsLive, getSellerJob, placeBid } from "@/lib/seller-job-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../../seller-shell.module.css";
import { useListingFailure } from "../../../listings/listing-status";
import { useSeller } from "../../../seller-context";

/** Place a bid on a job. The job is loaded first so the seller sees what they
 * are bidding on and is told at once if they cannot (closed, or a live bid
 * already stands). */
export function BidPlaceClient({ jobId }: { jobId: number }) {
  const router = useRouter();
  const fail = useListingFailure();
  const { handleAuthError } = useSeller();
  const [job, setJob] = useState<SellerJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSellerJob(jobId)
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
  }, [jobId, handleAuthError]);

  async function handleSubmit(input: Partial<SellerBidInput>) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const bid = await placeBid(jobId, input);
      router.push(`/seller/bids/${bid.id}?notice=placed`);
    } catch (err) {
      const message = fail(err);
      if (message == null) return;
      const parsed = parseFieldErrors(err);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.message ?? (Object.keys(parsed.fieldErrors).length === 0 ? message : null));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const back = `/seller/jobs/${jobId}`;
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

  const closed = job.status !== "open_for_bidding";
  const hasLive = job.my_bids.some(bidIsLive);

  return (
    <div>
      <Link href={back} className={management.backLink}>
        ← Back to the job
      </Link>
      <h1 className={shell.pageTitle}>Place a bid</h1>
      <p className={shell.pageText}>
        {job.title}
        {job.budget && <> · the buyer&apos;s budget is {tierText(job.budget.price, job.budget.price_type)}</>}
      </p>

      <div className={management.detailCard}>
        {closed ? (
          <p className={management.fieldHint}>This job isn&apos;t open for bidding.</p>
        ) : hasLive ? (
          <p className={management.fieldHint}>
            You already have a live bid on this job. Open it from the job page to change or cancel it.
          </p>
        ) : (
          <BidForm
            mode="create"
            variant="seller"
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => router.push(back)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
