"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { BidForm } from "@/app/(admin)/admin/(protected)/bidding/bid-form";
import { describeLoadError } from "@/lib/load-error";
import { SellerBidDetail, SellerBidInput, getMyBid, updateMyBid } from "@/lib/seller-job-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../../seller-shell.module.css";
import { useListingFailure } from "../../../listings/listing-status";
import { useSeller } from "../../../seller-context";

/** Edit a bid: only while it is pending. Saving sends only what changed. */
export function MyBidEditClient({ id }: { id: number }) {
  const router = useRouter();
  const fail = useListingFailure();
  const { handleAuthError } = useSeller();
  const [bid, setBid] = useState<SellerBidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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

  async function handleSubmit(input: Partial<SellerBidInput>) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await updateMyBid(id, input);
      router.push(`/seller/bids/${id}?notice=saved`);
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

  const back = `/seller/bids/${id}`;
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

  return (
    <div>
      <Link href={back} className={management.backLink}>
        ← Back to the bid
      </Link>
      <h1 className={shell.pageTitle}>Edit bid</h1>
      <p className={shell.pageText}>{bid.job.title}</p>
      <div className={management.detailCard}>
        {bid.status === "pending" ? (
          <BidForm
            mode="edit"
            variant="seller"
            initial={bid}
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => router.push(back)}
            onSubmit={handleSubmit}
          />
        ) : (
          <p className={management.fieldHint}>This bid can no longer be edited (only a pending bid can).</p>
        )}
      </div>
    </div>
  );
}
