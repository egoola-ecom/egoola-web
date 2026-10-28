"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJob } from "@/lib/admin-jobs-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { JobForm } from "../job-form";
import styles from "../../management.module.css";

const JOBS_LIST = "/admin/jobs";

/** Add Job: posts a job on a buyer's behalf. On success the admin lands on
 * the new job, which is already open for bidding. */
export function JobCreateClient({ buyerId }: { buyerId: number | null }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(input: Parameters<typeof createJob>[0]) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await createJob(input);
      router.push(`/admin/jobs/${created.id}`);
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
      <button type="button" className={styles.backLink} onClick={() => router.push(JOBS_LIST)}>
        ← Back to Jobs
      </button>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Add Job</h1>
          <p className={styles.subtitle}>
            Post a request for work on a buyer&apos;s behalf. It is open for bidding as soon as it
            is saved; there is no review step.
          </p>
        </div>
      </div>
      <div className={styles.detailCard}>
        <JobForm
          mode="create"
          initialBuyer={buyerId}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(JOBS_LIST)}
          onSubmit={(input) => handleSubmit(input as Parameters<typeof createJob>[0])}
        />
      </div>
    </div>
  );
}
