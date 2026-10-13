"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbnailControl } from "@/components/thumbnail-control";
import { ApiError, apiErrorDetail } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import {
  GigDetail,
  deleteGig,
  deleteGigThumbnail,
  getGig,
  putGigThumbnail,
  updateGigStatus,
} from "@/lib/gig-api";
import { ListingStatusInput } from "@/lib/listing-api";
import { notifyPendingGigsChanged } from "@/lib/pending-gig-count";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { ListingChangeHistory } from "../../catalog/listings/listing-change-history";
import { ListingModerationPanel } from "../../catalog/listings/listing-moderation-panel";
import { statusBadgeClass, statusLabel } from "../../catalog/listings/listing-utils";
import { GigProfileView } from "../gig-profile-view";
import { RateDisplay } from "../gig-utils";
import styles from "../../management.module.css";

export function GigDetailClient({
  id,
  fromRequests = false,
}: {
  id: number;
  /** Opened from the Pending Gigs queue: "Back" returns there. */
  fromRequests?: boolean;
}) {
  const router = useRouter();
  const backHref = fromRequests ? "/admin/gigs/requests" : "/admin/gigs";
  const backLabel = fromRequests ? "← Back to Pending Gigs" : "← Back to Gigs";
  const [gig, setGig] = useState<GigDetail | null>(null);
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

    getGig(id)
      .then((detail) => {
        if (!cancelled) setGig(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handleAuthError(err)) {
          // A deleted gig is a soft delete: its detail answers 404, and so
          // does the id of a product (those open under Listings).
          setLoadError(
            err instanceof ApiError && err.status === 404
              ? "This gig was not found — it may have been deleted, or it is a product (products are under Listings)."
              : "Couldn't load this gig. Please try again.",
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
      setGig(await updateGigStatus(id, input));
      notifyPendingGigsChanged();
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
   * gig again so it shows. The status never changes for an admin. */
  async function refreshAfterThumbnail() {
    try {
      setGig(await getGig(id));
    } catch (err) {
      handleAuthError(err);
    }
  }

  async function handleDelete() {
    if (!gig) return;
    if (!window.confirm(`Delete gig "${gig.title}"? It will disappear from the list.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteGig(id);
      notifyPendingGigsChanged();
      router.push("/admin/gigs");
    } catch (err) {
      if (!handleAuthError(err)) {
        setDeleteError(apiErrorDetail(err) ?? "Couldn't delete this gig. Please try again.");
      }
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className={styles.stateRow}>Loading…</p>;
  }

  if (loadError || !gig) {
    return (
      <div>
        <button type="button" className={styles.backLink} onClick={() => router.push(backHref)}>
          {backLabel}
        </button>
        <p className={styles.errorBanner}>{loadError ?? "Gig not found."}</p>
      </div>
    );
  }

  // The "from" rate names what it is for: the cheapest active package.
  const cheapest = [...gig.skus]
    .filter((sku) => sku.is_active)
    .sort((a, b) => Number(a.effective_price) - Number(b.effective_price))[0];

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push(backHref)}>
        {backLabel}
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>{gig.title}</h1>
          {gig.title_bn && <p className={styles.subtitle}>{gig.title_bn}</p>}
          <p className={styles.subtitle}>Gig · service offer</p>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.badge} ${statusBadgeClass(gig.status)}`}>
              {statusLabel(gig.status)}
            </span>
            <RateDisplay
              price={gig.price}
              discountedPrice={gig.discounted_price}
              priceType={cheapest?.price_type ?? null}
              currency={gig.currency}
              from
            />
          </div>
        </div>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => router.push(`/admin/gigs/${id}/edit`)}
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
        key={gig.status_change_logs.length}
        listing={gig}
        noun="gig"
        fieldErrors={moderationErrors}
        formError={moderationError}
        submitting={moderating}
        onSubmit={handleModerationSubmit}
      />

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Thumbnail</h2>
        <ThumbnailControl
          mode="live"
          imageUrl={gig.image_url}
          actorType="admin"
          loginPath="/admin/login"
          onUpload={(file) => putGigThumbnail(id, file)}
          onRemove={() => deleteGigThumbnail(id)}
          onChanged={() => void refreshAfterThumbnail()}
        />
      </div>

      <ListingChangeHistory logs={gig.info_change_logs ?? []} />

      <GigProfileView gig={gig} />
    </div>
  );
}
