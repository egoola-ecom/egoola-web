"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbnailControl } from "@/components/thumbnail-control";
import {
  ListingDetail,
  ListingStatusInput,
  deleteListing,
  deleteListingThumbnail,
  getListing,
  putListingThumbnail,
  updateListingStatus,
} from "@/lib/listing-api";
import { ApiError, apiErrorDetail } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { notifyPendingListingsChanged } from "@/lib/pending-listing-count";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { ListingChangeHistory } from "../listing-change-history";
import { ListingModerationPanel } from "../listing-moderation-panel";
import { ListingProfileView } from "../listing-profile-view";
import {
  PriceDisplay,
  listingTypeLabel,
  statusBadgeClass,
  statusLabel,
} from "../listing-utils";
import styles from "../../../management.module.css";

export function ListingDetailClient({
  id,
  fromRequests = false,
}: {
  id: number;
  /** Opened from the Pending Listings queue: "Back" returns there. */
  fromRequests?: boolean;
}) {
  const router = useRouter();
  const backHref = fromRequests ? "/admin/catalog/listings/requests" : "/admin/catalog/listings";
  const backLabel = fromRequests ? "← Back to Pending Listings" : "← Back to Listings";
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [moderating, setModerating] = useState(false);
  const [moderationErrors, setModerationErrors] = useState<FieldErrors>({});
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);

    getListing(id)
      .then((detail) => {
        if (!cancelled) setListing(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handleAuthError(err)) {
          // A deleted listing is a soft delete: its detail answers 404, and so
          // does the id of a gig (those open under Gigs).
          setLoadError(
            err instanceof ApiError && err.status === 404
              ? "This listing was not found — it may have been deleted, or it is a gig (gigs are under Gigs)."
              : "Couldn't load this listing. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleModerationSubmit(input: ListingStatusInput) {
    setModerating(true);
    setModerationErrors({});
    setModerationError(null);
    try {
      setListing(await updateListingStatus(id, input));
      notifyPendingListingsChanged();
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors, message } = parseFieldErrors(err);
        setModerationErrors(fieldErrors);
        setModerationError(message);
      }
    } finally {
      setModerating(false);
    }
  }

  /** After a thumbnail change the content change log has a new row: load the
   * listing again so it shows. The status never changes for an admin. */
  async function refreshAfterThumbnail() {
    try {
      setListing(await getListing(id));
    } catch (err) {
      handleAuthError(err);
    }
  }

  async function handleDelete() {
    if (!listing) return;
    if (!window.confirm(`Delete listing "${listing.title}"? It will disappear from the list.`)) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteListing(id);
      notifyPendingListingsChanged();
      router.push("/admin/catalog/listings");
    } catch (err) {
      if (!handleAuthError(err)) {
        setDeleteError(apiErrorDetail(err) ?? "Couldn't delete this listing. Please try again.");
      }
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className={styles.stateRow}>Loading…</p>;
  }

  if (loadError || !listing) {
    return (
      <div>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => router.push(backHref)}
        >
          {backLabel}
        </button>
        <p className={styles.errorBanner}>{loadError ?? "Listing not found."}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(backHref)}
      >
        {backLabel}
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>{listing.title}</h1>
          {listing.title_bn && <p className={styles.subtitle}>{listing.title_bn}</p>}
          <p className={styles.subtitle}>
            Product
            {listing.listing_type ? ` · ${listingTypeLabel(listing.listing_type)}` : ""}
            {listing.brand_name ? ` · ${listing.brand_name}` : ""}
          </p>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.badge} ${statusBadgeClass(listing.status)}`}>
              {statusLabel(listing.status)}
            </span>
            <PriceDisplay
              price={listing.price}
              discountedPrice={listing.discounted_price}
              currency={listing.currency}
              from
            />
          </div>
        </div>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => router.push(`/admin/catalog/listings/${id}/edit`)}
          >
            Update
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {deleteError && <p className={styles.errorBanner}>{deleteError}</p>}

      <ListingModerationPanel
        key={listing.status_change_logs.length}
        listing={listing}
        fieldErrors={moderationErrors}
        formError={moderationError}
        submitting={moderating}
        onSubmit={handleModerationSubmit}
      />

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Thumbnail</h2>
        <ThumbnailControl
          mode="live"
          imageUrl={listing.image_url}
          actorType="admin"
          loginPath="/admin/login"
          onUpload={(file) => putListingThumbnail(id, file)}
          onRemove={() => deleteListingThumbnail(id)}
          onChanged={() => void refreshAfterThumbnail()}
        />
      </div>

      <ListingChangeHistory logs={listing.info_change_logs ?? []} />

      <ListingProfileView listing={listing} />
    </div>
  );
}
