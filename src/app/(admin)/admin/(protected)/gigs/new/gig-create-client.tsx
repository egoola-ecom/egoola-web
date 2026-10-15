"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError, clearSession } from "@/lib/auth";
import { GigInput, createGig } from "@/lib/gig-api";
import { addFiles, filesErrorReason } from "@/lib/listing-files-api";
import { notifyPendingGigsChanged } from "@/lib/pending-gig-count";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { GigForm, GigFormValues } from "../gig-form";
import styles from "../../management.module.css";

const GIGS_LIST = "/admin/gigs";

/** Add Gig page — the form is too large for a modal, so create gets its own
 * page; on success the admin lands on the new gig's details. The gig is sent
 * as JSON; the thumbnail and gallery go up afterwards with the files API. */
export function GigCreateClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit({ input, files, thumbnail }: GigFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await createGig(input as GigInput);
      notifyPendingGigsChanged();
      // Files have their own API, so they go up once the gig exists. If that
      // fails the gig is kept (no rollback) and the admin lands on the edit
      // page with the reason, to try again.
      if (files.length > 0 || thumbnail) {
        try {
          await addFiles("admin", created.id, { thumbnail, media: files });
        } catch (filesErr) {
          if (filesErr instanceof AuthError) throw filesErr;
          router.push(
            `/admin/gigs/${created.id}/edit?filesError=${encodeURIComponent(filesErrorReason(filesErr))}`,
          );
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
