"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  ListingForm,
  ListingFormValues,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-form";
import { ApiError } from "@/lib/api";
import {
  SellerListingDetail,
  getSellerListing,
  updateSellerListing,
} from "@/lib/seller-listing-api";
import { ListingFilesControl } from "@/components/listing-files-control";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../../seller-shell.module.css";
import { sellerChanges, toSellerInput } from "../../listing-payload";
import { SellerStatusChip, needsFixing, useListingFailure } from "../../listing-status";

/** Edit a listing. The save follows the status:
 *  - pending stays pending, approved STAYS approved (no re-review);
 *  - rejected / changes requested (and an admin-made draft) go back to
 *    pending on ANY save — saving IS resubmitting, so there is no separate
 *    button. */
export function ListingEditClient({
  id,
  initialFilesError,
}: {
  id: number;
  /** Set when the product was just created but its files were not uploaded. */
  initialFilesError: string | null;
}) {
  const router = useRouter();
  const fail = useListingFailure();
  const [listing, setListing] = useState<SellerListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    initialFilesError
      ? `The listing was created, but its files were not uploaded: ${initialFilesError} Add them again in the Files card below.`
      : null,
  );

  const load = useCallback(async () => {
    try {
      const detail = await getSellerListing(id);
      setListing(detail);
      setLoadError(null);
      return detail;
    } catch (err) {
      const message = fail(err);
      if (message != null) {
        // Another seller's listing (or a deleted one) is a plain 404.
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "We couldn't find this listing. It may belong to someone else or have been removed."
            : message,
        );
      }
      return null;
    }
  }, [id, fail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().finally(() => setLoading(false));
  }, [load]);

  async function handleSubmit({ input }: ListingFormValues) {
    if (!listing) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    const resubmits = needsFixing(listing.status);
    try {
      const changes = sellerChanges(toSellerInput(input), listing);
      // A rejected / changes-requested listing is resubmitted by ANY save,
      // even one with nothing in it; other statuses only save real changes.
      if (Object.keys(changes).length > 0 || resubmits) {
        await updateSellerListing(id, changes);
      }
      router.push(`/seller/listings/${id}?notice=${resubmits ? "resubmitted" : "saved"}`);
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

  if (loading) return <p className={management.stateRow}>Loading…</p>;

  if (loadError || !listing) {
    return (
      <div>
        <Link href="/seller/listings" className={management.backLink}>
          ← Back to my listings
        </Link>
        <p className={management.errorBanner}>{loadError ?? "Listing not found."}</p>
      </div>
    );
  }

  const resubmits = needsFixing(listing.status);

  return (
    <div>
      <Link href={`/seller/listings/${id}`} className={management.backLink}>
        ← Back to listing
      </Link>
      <h1 className={shell.pageTitle}>Edit listing</h1>
      <p className={shell.pageText}>
        {listing.title} <SellerStatusChip status={listing.status} />
      </p>

      {resubmits && (
        <div className={management.errorBanner} role="status">
          <strong>
            {listing.status === "rejected"
              ? "An admin rejected this listing."
              : listing.status === "changes_requested"
                ? "An admin asked for changes."
                : "This listing is a draft."}
          </strong>
          {listing.note && <div>Reason: {listing.note}</div>}
          <div>Fix it and save: saving sends it back to the admin for review.</div>
        </div>
      )}
      {listing.status === "approved" && (
        <p className={management.secondaryText} style={{ marginBottom: "0.75rem" }}>
          This listing is approved. Your changes are saved right away.
        </p>
      )}
      {notice && <p className={management.noticeBanner}>{notice}</p>}

      <div className={management.detailCard} style={{ marginBottom: "1rem" }}>
        <h2 className={management.detailCardTitle}>Files</h2>
        <ListingFilesControl
          mode="live"
          scope="seller"
          loginPath="/login"
          listingId={id}
          imageUrl={listing.image_url}
          media={listing.media}
          onFailure={fail}
          onSaved={(result) =>
            setListing((current) =>
              current
                ? {
                    ...current,
                    image_path: result.image_path,
                    image_url: result.image_url,
                    media: result.media,
                    status: result.status,
                  }
                : current,
            )
          }
        />
        <p className={management.fieldHint}>
          Files are saved on their own and do not change the review status. Only saving the form
          below sends a rejected listing back for review.
        </p>
      </div>

      <div className={management.detailCard}>
        <ListingForm
          key={listing.updated_at}
          mode="edit"
          variant="seller"
          initial={listing}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/seller/listings/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
