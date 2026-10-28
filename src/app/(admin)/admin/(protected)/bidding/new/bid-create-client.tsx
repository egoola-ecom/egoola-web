"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBid } from "@/lib/admin-bids-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { BidForm } from "../bid-form";
import styles from "../../management.module.css";

/** Add Bid: places a bid on a seller's behalf. The server checks the job is
 * open and the seller has no other live bid on it; its message is shown. */
export function BidCreateClient({
  jobId,
  sellerId,
}: {
  jobId: number | null;
  sellerId: number | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(input: Parameters<typeof createBid>[0]) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await createBid(input);
      router.push(`/admin/bidding/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) {
        clearSession("admin");
        router.replace("/admin/login");
        return;
      }
      const { fieldErrors: fe, message } = parseFieldErrors(err);
      setFieldErrors(fe);
      setFormError(message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/bidding")}>
        ← Back to Bidding
      </button>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Add Bid</h1>
          <p className={styles.subtitle}>
            Place a bid on a job for a seller. It starts pending; hire it from its page.
          </p>
        </div>
      </div>
      <div className={styles.detailCard}>
        <BidForm
          mode="create"
          initialJob={jobId}
          initialSeller={sellerId}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push("/admin/bidding")}
          onSubmit={(input) => handleSubmit(input as Parameters<typeof createBid>[0])}
        />
      </div>
    </div>
  );
}
