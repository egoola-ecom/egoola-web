"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createListing, putListingThumbnail, syncListingMedia } from "@/lib/listing-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { ListingForm, ListingFormValues } from "../listing-form";
import styles from "../../../management.module.css";

const LISTINGS_TAB = "/admin/catalog/listings";

/** Add Listing page — the listing form is too large for a modal, so create
 * gets its own page; on success the admin lands on the new listing's
 * details. */
export function ListingCreateClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit({ input, files, thumbnail }: ListingFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    let createdId: number | null = null;
    try {
      const created = await createListing(input);
      createdId = created.id;
      // Media travels as multipart, which can't carry the nested price
      // tiers, so it is uploaded in a second request.
      if (files.length > 0) await syncListingMedia(created.id, files, []);
      // The thumbnail has its own endpoint: it can only go up once the listing
      // exists. If it fails the listing is kept (no rollback) and the admin
      // lands on the edit page with the reason, to try the picture again.
      if (thumbnail) {
        try {
          await putListingThumbnail(created.id, thumbnail);
        } catch (thumbnailErr) {
          if (thumbnailErr instanceof AuthError) throw thumbnailErr;
          const reason =
            parseFieldErrors(thumbnailErr).fieldErrors.image?.[0] ??
            parseFieldErrors(thumbnailErr).message ??
            "The picture could not be uploaded.";
          router.push(
            `/admin/catalog/listings/${created.id}/edit?thumbnailError=${encodeURIComponent(reason)}`,
          );
          return;
        }
      }
      router.push(`/admin/catalog/listings/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) {
        clearSession("admin");
        router.replace("/admin/login");
        return;
      }
      if (createdId != null) {
        // The listing exists; only its media failed. Send the admin to the
        // edit page to retry rather than risking a duplicate listing here.
        window.alert(
          "The listing was created, but its media upload failed. You can add media from the Update page.",
        );
        router.push(`/admin/catalog/listings/${createdId}/edit`);
        return;
      }
      const { fieldErrors: fe, message } = parseFieldErrors(err);
      setFieldErrors(fe);
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push(LISTINGS_TAB)}>
        ← Back to Listings
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Add Listing</h1>
          <p className={styles.subtitle}>
            Create a product listing. Admin-created listings are approved by default.
          </p>
        </div>
      </div>

      <div className={styles.detailCard}>
        <ListingForm
          mode="create"
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(LISTINGS_TAB)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
