"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  GigForm,
  GigFormValues,
} from "@/app/(admin)/admin/(protected)/gigs/gig-form";
import { SellerGigInput, createSellerGig } from "@/lib/seller-gig-api";
import { ApiError } from "@/lib/api";
import { addFiles, filesErrorReason } from "@/lib/listing-files-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { useListingFailure } from "../../listings/listing-status";

/** Create gig. The gig is always saved as pending and is the seller's own. It
 * goes as JSON; the thumbnail and gallery go up afterwards with the files API. */
export function GigCreateClient() {
  const router = useRouter();
  const fail = useListingFailure();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit({ input, files, thumbnail }: GigFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await createSellerGig(input as SellerGigInput);
      // Files have their own API, so they go up once the gig exists. If that
      // fails the gig is kept: stay on its edit page with the reason, so the
      // seller can retry without creating a second gig.
      if (files.length > 0 || thumbnail) {
        try {
          await addFiles("seller", created.id, { thumbnail, media: files });
        } catch (filesErr) {
          const reason =
            filesErr instanceof ApiError && filesErr.status === 400
              ? filesErrorReason(filesErr)
              : fail(filesErr);
          if (reason == null) return;
          router.push(`/seller/gigs/${created.id}/edit?filesError=${encodeURIComponent(reason)}`);
          return;
        }
      }
      router.push(`/seller/gigs/${created.id}?notice=created`);
    } catch (err) {
      const message = fail(err);
      if (message == null) return;
      const parsed = parseFieldErrors(err);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.message ?? (Object.keys(parsed.fieldErrors).length === 0 ? message : null));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link href="/seller/gigs" className={management.backLink}>
        ← Back to my gigs
      </Link>
      <h1 className={shell.pageTitle}>Create gig</h1>
      <p className={shell.pageText}>
        Offer a service, priced by packages. An admin checks every new gig before buyers see it.
      </p>

      <div className={management.detailCard}>
        <GigForm
          mode="create"
          variant="seller"
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push("/seller/gigs")}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
