"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createListing } from "@/lib/listing-api";
import { addFiles, filesErrorReason } from "@/lib/listing-files-api";
import { notifyPendingListingsChanged } from "@/lib/pending-listing-count";
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
    try {
      const created = await createListing(input);
      // A product created as "pending" joins the pending list: refresh the badge.
      notifyPendingListingsChanged();
      // Files have their own API, so they go up once the listing exists. If
      // that fails the listing is kept (no rollback) and the admin lands on
      // the edit page with the reason, to try again.
      if (files.length > 0 || thumbnail) {
        try {
          await addFiles("admin", created.id, { thumbnail, media: files });
        } catch (filesErr) {
          if (filesErr instanceof AuthError) throw filesErr;
          router.push(
            `/admin/catalog/listings/${created.id}/edit?filesError=${encodeURIComponent(filesErrorReason(filesErr))}`,
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
