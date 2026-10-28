"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JobDetail, getJob, updateJob } from "@/lib/admin-jobs-api";
import { AuthError, clearSession } from "@/lib/auth";
import { describeLoadError } from "@/lib/load-error";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { JobForm } from "../../job-form";
import { jobIsEditable, jobStatusLabel } from "../../job-utils";
import styles from "../../../management.module.css";

/** Job Update page. Only what changed is sent, budget rows with their `id`.
 * A hired, completed or cancelled job cannot be edited here: the form is not
 * offered (the server refuses it too). */
export function JobEditClient({ id }: { id: number }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(input: Parameters<typeof updateJob>[1]) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await updateJob(id, input);
      router.push(`/admin/jobs/${id}`);
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

  const back = `/admin/jobs/${id}`;
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

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push(back)}>
        ← Back to Job
      </button>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Job</h1>
          <p className={styles.subtitle}>
            {job.title} · posted by {job.buyer.name}. The buyer cannot be changed.
          </p>
        </div>
      </div>
      <div className={styles.detailCard}>
        {jobIsEditable(job.status) ? (
          <JobForm
            mode="edit"
            initial={job}
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => router.push(back)}
            onSubmit={handleSubmit}
          />
        ) : (
          <p className={styles.fieldHint}>
            This job is {jobStatusLabel(job.status).toLowerCase()}, so its fields are locked. Use the
            status actions on the job&apos;s page.
          </p>
        )}
      </div>
    </div>
  );
}
