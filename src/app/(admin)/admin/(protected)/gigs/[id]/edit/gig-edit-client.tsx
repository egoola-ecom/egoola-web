"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, clearSession } from "@/lib/auth";
import { describeLoadError } from "@/lib/load-error";
import {
  GigDetail,
  getGig,
  updateGig,
} from "@/lib/gig-api";
import { ListingFilesControl } from "@/components/listing-files-control";
import { notifyPendingGigsChanged } from "@/lib/pending-gig-count";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { GigForm, GigFormValues } from "../../gig-form";
import styles from "../../../management.module.css";

/** Gig Update page — the editable form, reached only via the "Update" button
 * on the Gig Details page. Only what changed is sent, packages with their
 * `id`. Saving or cancelling returns to the details page. Status is not
 * editable here; moderation lives on the details page. */
export function GigEditClient({
  id,
  initialFilesError = null,
}: {
  id: number;
  /** Set when the gig was just created but its files were not uploaded. */
  initialFilesError?: string | null;
}) {
  const router = useRouter();
  const [gig, setGig] = useState<GigDetail | null>(null);
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

    getGig(id)
      .then((detail) => {
        if (!cancelled) setGig(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handleAuthError(err)) {
          setLoadError(describeLoadError(err, "This gig was not found — it may have been deleted, or it is a product (products are under Listings).", "Couldn't load this gig. Please try again."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit({ input }: GigFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (Object.keys(input).length > 0) {
        await updateGig(id, input);
        notifyPendingGigsChanged();
      }
      router.push(`/admin/gigs/${id}`);
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        setFieldErrors(fe);
        setFormError(message);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className={styles.stateRow}>Loading…</p>;
  }

  if (loadError || !gig) {
    return <p className={styles.errorBanner}>{loadError ?? "Gig not found."}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(`/admin/gigs/${id}`)}
      >
        ← Back to Gig Details
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Gig</h1>
          <p className={styles.subtitle}>{gig.title}</p>
        </div>
      </div>

      {initialFilesError && (
        <p className={styles.errorBanner}>
          The gig was created, but its files were not uploaded: {initialFilesError} Add them again
          in the Files card below.
        </p>
      )}

      <div className={styles.detailCard} style={{ marginBottom: "1rem" }}>
        <p className={styles.sectionDivider}>Files</p>
        <ListingFilesControl
          mode="live"
          scope="admin"
          loginPath="/admin/login"
          listingId={id}
          imageUrl={gig.image_url}
          media={gig.media}
          onSaved={(result) =>
            setGig((prev) =>
              prev
                ? { ...prev, image_path: result.image_path, image_url: result.image_url, media: result.media }
                : prev,
            )
          }
        />
      </div>

      <div className={styles.detailCard}>
        <GigForm
          mode="edit"
          initial={gig}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/admin/gigs/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
