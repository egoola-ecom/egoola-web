"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BidDetail, getBid, updateBid } from "@/lib/admin-bids-api";
import { AuthError, clearSession } from "@/lib/auth";
import { describeLoadError } from "@/lib/load-error";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { BidForm } from "../../bid-form";
import styles from "../../../management.module.css";

/** Bid Update page: only a pending bid can be edited. */
export function BidEditClient({ id }: { id: number }) {
  const router = useRouter();
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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
    setLoading(true);
    setLoadError(null);
    getBid(id)
      .then((detail) => {
        if (!cancelled) setBid(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setLoadError(describeLoadError(err, "This bid was not found.", "Couldn't load this bid. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(input: Parameters<typeof updateBid>[1]) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await updateBid(id, input);
      router.push(`/admin/bidding/${id}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      const { fieldErrors: fe, message } = parseFieldErrors(err);
      setFieldErrors(fe);
      setFormError(message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  const back = `/admin/bidding/${id}`;
  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !bid) {
    return (
      <div>
        <button type="button" className={styles.backLink} onClick={() => router.push("/admin/bidding")}>
          ← Back to Bidding
        </button>
        <p className={styles.errorBanner}>{loadError ?? "Bid not found."}</p>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push(back)}>
        ← Back to Bid
      </button>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Bid</h1>
          <p className={styles.subtitle}>
            {bid.bidder.name} on {bid.job.title}
          </p>
        </div>
      </div>
      <div className={styles.detailCard}>
        {bid.status === "pending" ? (
          <BidForm
            mode="edit"
            initial={bid}
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => router.push(back)}
            onSubmit={handleSubmit}
          />
        ) : (
          <p className={styles.fieldHint}>This bid can no longer be edited (only a pending bid can).</p>
        )}
      </div>
    </div>
  );
}
