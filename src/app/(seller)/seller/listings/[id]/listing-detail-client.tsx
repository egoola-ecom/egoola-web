"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { listingTypeLabel } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import { ListingFilesControl } from "@/components/listing-files-control";
import { ApiError } from "@/lib/api";
import {
  SellerListingDetail,
  getSellerListing,
} from "@/lib/seller-listing-api";
import shell from "../../../seller-shell.module.css";
import { SellerStatusChip, needsFixing, useListingFailure } from "../listing-status";
import { SellerListingView, StatusTimeline } from "../seller-listing-view";

const NOTICES: Record<string, string> = {
  created: "Listing created. It is waiting for an admin to review it.",
  saved: "Changes saved.",
  resubmitted: "Changes saved. The listing is back with the admin, waiting for review.",
};

/** What the seller needs to know about where the listing stands, and what to
 * do next. */
function StatusBanner({ listing }: { listing: SellerListingDetail }) {
  if (listing.status === "pending") {
    return (
      <div className={management.noticeBanner} role="status">
        <strong>Waiting for review.</strong> An admin will check this listing. You can still edit it
        meanwhile; it keeps its place in the queue.
        {listing.note && <div>Your message to the reviewer: {listing.note}</div>}
      </div>
    );
  }
  if (listing.status === "approved") {
    return (
      <div className={management.noticeBanner} role="status">
        <strong>Approved.</strong> Your edits save right away and the listing stays approved.
        {listing.note && <div>Note from the admin: {listing.note}</div>}
      </div>
    );
  }
  const title =
    listing.status === "rejected"
      ? "An admin rejected this listing."
      : listing.status === "changes_requested"
        ? "An admin asked for changes."
        : "This listing is a draft.";
  return (
    <div className={management.errorBanner} role="status">
      <strong>{title}</strong>
      {listing.note && <div>Reason: {listing.note}</div>}
      <div>
        Edit the listing and save it: saving sends it back to the admin for review.{" "}
        <Link href={`/seller/listings/${listing.id}/edit`}>Edit and send for review</Link>
      </div>
    </div>
  );
}

export function ListingDetailClient({ id, notice }: { id: number; notice: string | null }) {
  const fail = useListingFailure();
  const [listing, setListing] = useState<SellerListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getSellerListing(id)
      .then((detail) => {
        if (!cancelled) setListing(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = fail(err);
        if (message == null) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "We couldn't find this listing. It may belong to someone else or have been removed."
            : message,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** After a thumbnail change: load the listing again, since a rejected one
   * goes back to "waiting for review" when its picture changes. */
  async function refresh() {
    try {
      setListing(await getSellerListing(id));
    } catch (err) {
      fail(err);
    }
  }

  if (loading) return <p className={management.stateRow}>Loading…</p>;

  if (error || !listing) {
    return (
      <div>
        <Link href="/seller/listings" className={management.backLink}>
          ← Back to my listings
        </Link>
        <p className={management.errorBanner}>{error ?? "Listing not found."}</p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/seller/listings" className={management.backLink}>
        ← Back to my listings
      </Link>

      <div className={management.detailHeader}>
        <div className={management.detailHeaderInfo}>
          <h1 className={shell.pageTitle}>{listing.title}</h1>
          <p className={shell.pageText} style={{ marginBottom: "0.5rem" }}>
            Product
            {listing.listing_type ? ` · ${listingTypeLabel(listing.listing_type)}` : ""}
            {listing.brand_name ? ` · ${listing.brand_name}` : ""}
          </p>
          <div className={management.detailBadgeRow}>
            <SellerStatusChip status={listing.status} />
          </div>
        </div>
        <div className={management.rowActions}>
          <Link href={`/seller/listings/${id}/edit`} className={management.addButton}>
            {needsFixing(listing.status) ? "Edit and send for review" : "Edit"}
          </Link>
        </div>
      </div>

      {notice && NOTICES[notice] && <p className={management.noticeBanner}>{NOTICES[notice]}</p>}
      <StatusBanner listing={listing} />
      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Thumbnail and gallery</h2>
        <ListingFilesControl
          mode="live"
          scope="seller"
          loginPath="/login"
          listingId={id}
          imageUrl={listing.image_url}
          media={listing.media}
          onFailure={fail}
          onSaved={() => void refresh()}
        />
        <p className={management.fieldHint}>
          Changing files does not change the review status. Only saving the listing itself sends
          it back for review.
        </p>
      </div>
      <SellerListingView listing={listing} />
      <StatusTimeline listing={listing} />
    </div>
  );
}
