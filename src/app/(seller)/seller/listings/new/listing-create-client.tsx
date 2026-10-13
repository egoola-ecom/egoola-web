"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  ListingForm,
  ListingFormValues,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-form";
import {
  createSellerListing,
  putSellerListingThumbnail,
  syncSellerListingMedia,
} from "@/lib/seller-listing-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { toSellerInput } from "../listing-payload";
import { useListingFailure } from "../listing-status";

/** Create product. One form for the six product formats (a service offer is a
 * gig). The listing is always saved as pending and is the seller's own;
 * pictures go in a second request because multipart cannot carry the nested
 * SKUs and price tiers, and the thumbnail in a third (its own endpoint). */
export function ListingCreateClient() {
  const router = useRouter();
  const fail = useListingFailure();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit({ input, files, thumbnail }: ListingFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    let createdId: number | null = null;
    try {
      const created = await createSellerListing(toSellerInput(input));
      createdId = created.id;
      if (files.length > 0) await syncSellerListingMedia(created.id, files, []);
      if (thumbnail) {
        try {
          await putSellerListingThumbnail(created.id, thumbnail);
        } catch (thumbnailErr) {
          // The listing exists: stay on its edit page with the reason, so the
          // seller can retry the picture without creating a second listing.
          const reason =
            parseFieldErrors(thumbnailErr).fieldErrors.image?.[0] ?? fail(thumbnailErr);
          if (reason == null) return;
          router.push(
            `/seller/listings/${created.id}/edit?thumbnailError=${encodeURIComponent(reason)}`,
          );
          return;
        }
      }
      router.push(`/seller/listings/${created.id}?notice=created`);
    } catch (err) {
      if (createdId != null) {
        // The listing exists; only its files failed. Go to its edit page to
        // add them again rather than risk a duplicate (the same title is
        // refused anyway).
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        const reason = fe.media_file?.join(" ") ?? message ?? "The files could not be uploaded.";
        router.push(`/seller/listings/${createdId}/edit?mediaError=${encodeURIComponent(reason)}`);
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
      <Link href="/seller/listings" className={management.backLink}>
        ← Back to my listings
      </Link>
      <h1 className={shell.pageTitle}>Create listing</h1>
      <p className={shell.pageText}>
        Add a product. An admin checks every new listing before buyers see it.
      </p>

      <div className={management.detailCard}>
        <ListingForm
          mode="create"
          variant="seller"
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push("/seller/listings")}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
