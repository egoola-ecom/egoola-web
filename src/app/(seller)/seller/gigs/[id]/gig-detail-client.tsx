"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { RateDisplay } from "@/app/(admin)/admin/(protected)/gigs/gig-utils";
import { ThumbnailControl } from "@/components/thumbnail-control";
import { ApiError } from "@/lib/api";
import {
  SellerGigDetail,
  deleteSellerGigThumbnail,
  getSellerGig,
  putSellerGigThumbnail,
} from "@/lib/seller-gig-api";
import shell from "../../../seller-shell.module.css";
import { SellerStatusChip, needsFixing, useListingFailure } from "../../listings/listing-status";
import { StatusTimeline } from "../../listings/seller-listing-view";
import { SellerGigView } from "../seller-gig-view";

const NOTICES: Record<string, string> = {
  created: "Gig created. It is waiting for an admin to review it.",
  saved: "Changes saved.",
  resubmitted: "Changes saved. The gig is back with the admin, waiting for review.",
};

/** What the seller needs to know about where the gig stands, and what to do
 * next. */
function StatusBanner({ gig }: { gig: SellerGigDetail }) {
  if (gig.status === "pending") {
    return (
      <div className={management.noticeBanner} role="status">
        <strong>Waiting for review.</strong> An admin will check this gig. You can still edit it
        meanwhile; it keeps its place in the queue.
        {gig.note && <div>Your message to the reviewer: {gig.note}</div>}
      </div>
    );
  }
  if (gig.status === "approved") {
    return (
      <div className={management.noticeBanner} role="status">
        <strong>Approved.</strong> Your edits save right away and the gig stays approved.
        {gig.note && <div>Note from the admin: {gig.note}</div>}
      </div>
    );
  }
  const title =
    gig.status === "rejected"
      ? "An admin rejected this gig."
      : gig.status === "changes_requested"
        ? "An admin asked for changes."
        : "This gig is a draft.";
  return (
    <div className={management.errorBanner} role="status">
      <strong>{title}</strong>
      {gig.note && <div>Reason: {gig.note}</div>}
      <div>
        Edit the gig and save it: saving sends it back to the admin for review.{" "}
        <Link href={`/seller/gigs/${gig.id}/edit`}>Edit and send for review</Link>
      </div>
    </div>
  );
}

export function GigDetailClient({ id, notice }: { id: number; notice: string | null }) {
  const fail = useListingFailure();
  const [gig, setGig] = useState<SellerGigDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getSellerGig(id)
      .then((detail) => {
        if (!cancelled) setGig(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = fail(err);
        if (message == null) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "We couldn't find this gig. It may belong to someone else or have been removed."
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

  /** After a thumbnail change: load the gig again, since a rejected one goes
   * back to "waiting for review" when its picture changes. */
  async function refresh() {
    try {
      setGig(await getSellerGig(id));
    } catch (err) {
      fail(err);
    }
  }

  if (loading) return <p className={management.stateRow}>Loading…</p>;

  if (error || !gig) {
    return (
      <div>
        <Link href="/seller/gigs" className={management.backLink}>
          ← Back to my gigs
        </Link>
        <p className={management.errorBanner}>{error ?? "Gig not found."}</p>
      </div>
    );
  }

  const cheapest = [...gig.skus]
    .filter((sku) => sku.is_active)
    .sort((a, b) => Number(a.effective_price) - Number(b.effective_price))[0];

  return (
    <div>
      <Link href="/seller/gigs" className={management.backLink}>
        ← Back to my gigs
      </Link>

      <div className={management.detailHeader}>
        <div className={management.detailHeaderInfo}>
          <h1 className={shell.pageTitle}>{gig.title}</h1>
          <p className={shell.pageText} style={{ marginBottom: "0.5rem" }}>
            Gig · service offer
          </p>
          <div className={management.detailBadgeRow}>
            <SellerStatusChip status={gig.status} />
            <RateDisplay
              price={gig.price}
              discountedPrice={gig.discounted_price}
              priceType={cheapest?.price_type ?? null}
              currency={gig.currency}
              from
            />
          </div>
        </div>
        <div className={management.rowActions}>
          <Link href={`/seller/gigs/${id}/edit`} className={management.addButton}>
            {needsFixing(gig.status) ? "Edit and send for review" : "Edit"}
          </Link>
        </div>
      </div>

      {notice && NOTICES[notice] && <p className={management.noticeBanner}>{NOTICES[notice]}</p>}
      <StatusBanner gig={gig} />
      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Thumbnail</h2>
        <ThumbnailControl
          mode="live"
          imageUrl={gig.image_url}
          actorType="seller"
          loginPath="/login"
          onUpload={(file) => putSellerGigThumbnail(id, file)}
          onRemove={() => deleteSellerGigThumbnail(id)}
          onFailure={fail}
          onChanged={() => void refresh()}
        />
        {needsFixing(gig.status) && (
          <p className={management.fieldHint}>
            Changing the thumbnail sends this gig back to the admin for review.
          </p>
        )}
      </div>
      <SellerGigView gig={gig} />
      <StatusTimeline listing={gig} />
    </div>
  );
}
