"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  ListingForm,
  ListingFormValues,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-form";
import { createSellerListing } from "@/lib/seller-listing-api";
import { ApiError } from "@/lib/api";
import { addFiles, filesErrorReason } from "@/lib/listing-files-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { toSellerInput } from "../listing-payload";
import { useListingFailure } from "../listing-status";

/** Create product. One form for the six product formats (a service offer is a
 * gig). The listing is always saved as pending and is the seller's own;
 * files go up afterwards with the files API (the listing itself is JSON only). */
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
    try {
      const created = await createSellerListing(toSellerInput(input));
      // Files have their own API, so they go up once the listing exists. If that
      // fails the listing is kept: stay on its edit page with the reason, so the
      // seller can retry without creating a second listing.
      if (files.length > 0 || thumbnail) {
        try {
          await addFiles("seller", created.id, { thumbnail, media: files });
        } catch (filesErr) {
          const reason =
            filesErr instanceof ApiError && filesErr.status === 400
              ? filesErrorReason(filesErr)
              : fail(filesErr);
          if (reason == null) return;
          router.push(`/seller/listings/${created.id}/edit?filesError=${encodeURIComponent(reason)}`);
          return;
        }
      }
      router.push(`/seller/listings/${created.id}?notice=created`);
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
