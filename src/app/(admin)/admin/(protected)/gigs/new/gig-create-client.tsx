"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, clearSession } from "@/lib/auth";
import { GigInput, createGig, putGigThumbnail, syncGigMedia } from "@/lib/gig-api";
import { notifyPendingGigsChanged } from "@/lib/pending-gig-count";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { GigForm, GigFormValues } from "../gig-form";
import styles from "../../management.module.css";

const GIGS_LIST = "/admin/gigs";

/** Add Gig page — the form is too large for a modal, so create gets its own
 * page; on success the admin lands on the new gig's details. The gig is sent
 * as JSON (a multipart request cannot carry the packages); gallery files and
 * the thumbnail go up afterwards, each in its own request. */
export function GigCreateClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit({ input, files, thumbnail }: GigFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    let createdId: number | null = null;
    try {
      const created = await createGig(input as GigInput);
      createdId = created.id;
      notifyPendingGigsChanged();
      if (files.length > 0) await syncGigMedia(created.id, files, []);
      // The thumbnail has its own endpoint: it can only go up once the gig
      // exists. If it fails the gig is kept (no rollback) and the admin lands
      // on the edit page with the reason, to try the picture again.
      if (thumbnail) {
        try {
          await putGigThumbnail(created.id, thumbnail);
        } catch (thumbnailErr) {
          if (thumbnailErr instanceof AuthError) throw thumbnailErr;
          const parsed = parseFieldErrors(thumbnailErr);
          const reason =
            parsed.fieldErrors.image?.[0] ?? parsed.message ?? "The picture could not be uploaded.";
          router.push(`/admin/gigs/${created.id}/edit?thumbnailError=${encodeURIComponent(reason)}`);
          return;
        }
      }
      router.push(`/admin/gigs/${created.id}`);
    } catch (err) {
      if (err instanceof AuthError) {
        clearSession("admin");
        router.replace("/admin/login");
        return;
      }
      if (createdId != null) {
        // The gig exists; only its media failed. Send the admin to the edit
        // page to retry rather than risking a duplicate gig here.
        window.alert(
          "The gig was created, but its media upload failed. You can add media from the Update page.",
        );
        router.push(`/admin/gigs/${createdId}/edit`);
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
      <button type="button" className={styles.backLink} onClick={() => router.push(GIGS_LIST)}>
        ← Back to Gigs
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Add Gig</h1>
          <p className={styles.subtitle}>
            Create a service offer, priced by packages. Admin-created gigs are approved by default.
          </p>
        </div>
      </div>

      <div className={styles.detailCard}>
        <GigForm
          mode="create"
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(GIGS_LIST)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
