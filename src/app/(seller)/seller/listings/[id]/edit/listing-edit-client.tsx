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
  deleteSellerListingThumbnail,
  getSellerListing,
  putSellerListingThumbnail,
  syncSellerListingMedia,
  updateSellerListing,
} from "@/lib/seller-listing-api";
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
  initialMediaError,
  initialThumbnailError,
}: {
  id: number;
  initialMediaError: string | null;
  /** Set when the product was just created but its thumbnail upload failed. */
  initialThumbnailError: string | null;
}) {
  const router = useRouter();
  const fail = useListingFailure();
  const [listing, setListing] = useState<SellerListingDetail | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    initialMediaError
      ? `The listing was created, but its files were not uploaded: ${initialMediaError} Add them again below.`
      : initialThumbnailError
        ? `The listing was created, but its thumbnail was not uploaded: ${initialThumbnailError} Choose the picture again below.`
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

  async function handleSubmit({ input, files, deleteIds }: ListingFormValues) {
    if (!listing) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    const resubmits = needsFixing(listing.status);
    let saved = false;
    try {
      const changes = sellerChanges(toSellerInput(input), listing);
      // A rejected / changes-requested listing is resubmitted by ANY save,
      // even one with nothing in it; other statuses only save real changes.
      if (Object.keys(changes).length > 0 || resubmits) {
        await updateSellerListing(id, changes);
        saved = true;
      }
      if (files.length > 0 || deleteIds.length > 0) {
        await syncSellerListingMedia(id, files, deleteIds);
        saved = true;
      }
      router.push(`/seller/listings/${id}?notice=${resubmits ? "resubmitted" : "saved"}`);
    } catch (err) {
      const message = fail(err);
      if (message == null) return;
      const parsed = parseFieldErrors(err);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.message ?? (Object.keys(parsed.fieldErrors).length === 0 ? message : null));
      if (saved) {
        // The text changes were saved; only the files failed. Show the saved
        // listing (fresh URLs) with the reason, so nothing is saved twice.
        setNotice("Your changes were saved, but the files were not uploaded. Add them again.");
        await load();
        setFormVersion((v) => v + 1);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  /** The thumbnail saves at once. The answer carries the listing's status: a
   * rejected / changes-requested product goes back to pending when its picture
   * changes. Only that is updated here, so unsaved text in the form stays. */
  async function uploadThumbnail(file: File) {
    const result = await putSellerListingThumbnail(id, file);
    setListing((current) =>
      current
        ? {
            ...current,
            image_path: result.image_path,
            image_url: result.image_url,
            status: result.status,
          }
        : current,
    );
    return result;
  }

  async function removeThumbnail() {
    await deleteSellerListingThumbnail(id);
    setListing((current) =>
      current ? { ...current, image_path: null, image_url: null } : current,
    );
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

      <div className={management.detailCard}>
        <ListingForm
          key={`${listing.updated_at}-${formVersion}`}
          mode="edit"
          variant="seller"
          initial={listing}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/seller/listings/${id}`)}
          onSubmit={handleSubmit}
          thumbnail={{
            actorType: "seller",
            loginPath: "/login",
            upload: uploadThumbnail,
            remove: removeThumbnail,
            onFailure: fail,
            confirmUpload: needsFixing(listing.status)
              ? "This listing was rejected or sent back for changes. Changing its thumbnail sends it back to the admin for review. Continue?"
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
