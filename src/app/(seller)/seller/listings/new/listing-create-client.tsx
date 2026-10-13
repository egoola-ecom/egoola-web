"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  ListingForm,
  ListingFormValues,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-form";
import { createSellerListing, syncSellerListingMedia } from "@/lib/seller-listing-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../seller-shell.module.css";
import { toSellerInput } from "../listing-payload";
import { useListingFailure } from "../listing-status";

/** Create listing. One form for every kind (product or service, the six
 * product formats). The listing is always saved as pending and is the
 * seller's own; pictures go in a second request because multipart cannot
 * carry the nested SKUs and price tiers. */
export function ListingCreateClient() {
  const router = useRouter();
  const fail = useListingFailure();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit({ input, files }: ListingFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    let createdId: number | null = null;
    try {
      const created = await createSellerListing(toSellerInput(input));
      createdId = created.id;
      if (files.length > 0) await syncSellerListingMedia(created.id, files, []);
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
        Add a product or a service. An admin checks every new listing before buyers see it.
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
