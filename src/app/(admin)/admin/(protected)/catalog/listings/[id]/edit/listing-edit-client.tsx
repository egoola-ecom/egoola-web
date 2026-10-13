"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListingDetail,
  deleteListingThumbnail,
  getListing,
  putListingThumbnail,
  syncListingMedia,
  updateListing,
} from "@/lib/listing-api";
import { AuthError, clearSession } from "@/lib/auth";
import { describeLoadError } from "@/lib/load-error";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { listingChanges } from "@/app/(seller)/seller/listings/listing-payload";
import { ListingForm, ListingFormValues } from "../../listing-form";
import styles from "../../../../management.module.css";

/** Listing Update page — the editable form, reached only via the "Update"
 * button on the Listing Details page. Saving or cancelling returns to that
 * details page. Status is not editable here; moderation lives on the details
 * page. */
export function ListingEditClient({
  id,
  initialThumbnailError = null,
}: {
  id: number;
  /** Set when the listing was just created but its thumbnail upload failed. */
  initialThumbnailError?: string | null;
}) {
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
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

    getListing(id)
      .then((detail) => {
        if (!cancelled) setListing(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handleAuthError(err)) {
          setLoadError(describeLoadError(err, "This listing was not found — it may have been deleted, or it is not a product.", "Couldn't load this listing. Please try again."));
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

  async function handleSubmit({ input, files, deleteIds }: ListingFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (!listing) return;
      // A PATCH carries only what changed. catalog_type and posted_by_role can
      // never change after creation, so they are never sent on an edit.
      const changes = listingChanges(input, listing);
      delete changes.catalog_type;
      delete changes.posted_by_role;
      if (Object.keys(changes).length > 0) await updateListing(id, changes);
      // Media can't ride along with the nested price tiers, so it is saved
      // in its own multipart request.
      if (files.length > 0 || deleteIds.length > 0) {
        await syncListingMedia(id, files, deleteIds);
      }
      router.push(`/admin/catalog/listings/${id}`);
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        setFieldErrors(fe);
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className={styles.stateRow}>Loading…</p>;
  }

  if (loadError || !listing) {
    return <p className={styles.errorBanner}>{loadError ?? "Listing not found."}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(`/admin/catalog/listings/${id}`)}
      >
        ← Back to Listing Details
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Listing</h1>
          <p className={styles.subtitle}>{listing.title}</p>
        </div>
      </div>

      {initialThumbnailError && (
        <p className={styles.errorBanner}>
          The listing was created, but its thumbnail was not uploaded: {initialThumbnailError} Choose
          the picture again below.
        </p>
      )}

      <div className={styles.detailCard}>
        <ListingForm
          mode="edit"
          initial={listing}
          thumbnail={{
            actorType: "admin",
            loginPath: "/admin/login",
            upload: (file) => putListingThumbnail(id, file),
            remove: () => deleteListingThumbnail(id),
          }}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/admin/catalog/listings/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
