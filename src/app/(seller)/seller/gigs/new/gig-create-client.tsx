"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  GigForm,
  GigFormValues,
} from "@/app/(admin)/admin/(protected)/gigs/gig-form";
import {
  SellerGigInput,
  createSellerGig,
  putSellerGigThumbnail,
  syncSellerGigMedia,
} from "@/lib/seller-gig-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { useListingFailure } from "../../listings/listing-status";

/** Create gig. The gig is always saved as pending and is the seller's own. It
 * goes as JSON (a multipart request cannot carry the packages); gallery files
 * and the thumbnail go up afterwards, each in its own request. */
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
    let createdId: number | null = null;
    try {
      const created = await createSellerGig(input as SellerGigInput);
      createdId = created.id;
      if (files.length > 0) await syncSellerGigMedia(created.id, files, []);
      if (thumbnail) {
        try {
          await putSellerGigThumbnail(created.id, thumbnail);
        } catch (thumbnailErr) {
          // The gig exists: stay on its edit page with the reason, so the
          // seller can retry the picture without creating a second gig.
          const reason = parseFieldErrors(thumbnailErr).fieldErrors.image?.[0] ?? fail(thumbnailErr);
          if (reason == null) return;
          router.push(`/seller/gigs/${created.id}/edit?thumbnailError=${encodeURIComponent(reason)}`);
          return;
        }
      }
      router.push(`/seller/gigs/${created.id}?notice=created`);
    } catch (err) {
      if (createdId != null) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        const reason = fe.media_file?.join(" ") ?? message ?? "The files could not be uploaded.";
        router.push(`/seller/gigs/${createdId}/edit?mediaError=${encodeURIComponent(reason)}`);
        return;
      }
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
