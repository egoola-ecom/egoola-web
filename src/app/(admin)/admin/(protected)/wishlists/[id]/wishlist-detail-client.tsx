"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FavouriteDetail, getFavourite } from "@/lib/admin-favourites-api";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { BuyerCell, ListingThumb, actorLabel, formatDateTime } from "../../_shared/buyer-cell";
import { ReadonlyField, formatMoney } from "../../_shared/readonly-field";
import styles from "../../management.module.css";

export function WishlistDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [fav, setFav] = useState<FavouriteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);
    getFavourite(id)
      .then((detail) => {
        if (!cancelled) setFav(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AuthError) {
          clearSession("admin");
          router.replace("/admin/login");
          return;
        }
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "This favourite does not exist."
            : "Couldn't load this favourite. Please try again.",
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

  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !fav) {
    return <p className={styles.errorBanner}>{loadError ?? "Favourite not found."}</p>;
  }

  const { listing } = fav;

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push("/admin/wishlists")}
      >
        ← Back to Wishlists
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Favourite #{fav.id}</h1>
          <div className={styles.detailBadgeRow}>
            <span
              className={`${styles.badge} ${fav.listing_visible ? styles.badgeGreen : styles.badgeAmber}`}
            >
              {fav.listing_visible ? "Visible to buyers" : "Hidden from buyers"}
            </span>
            <span className={styles.secondaryText}>Saved {formatDateTime(fav.created_at)}</span>
          </div>
        </div>
      </div>

      {!fav.listing_visible && (
        <p className={styles.fieldHint}>
          Buyers cannot see this listing now. Check the listing status and the seller&apos;s
          status and verification below.
        </p>
      )}

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Saved listing</h2>
        <div className={styles.thumbCell}>
          <ListingThumb url={listing.image_url} />
          <div>
            <div className={styles.primaryText}>{listing.title}</div>
            {listing.title_bn && <div className={styles.secondaryText}>{listing.title_bn}</div>}
            <div className={styles.secondaryText}>
              {listing.catalog_type} · #{listing.id}
            </div>
          </div>
        </div>
        <div className={styles.formGrid} style={{ marginTop: "1rem" }}>
          <ReadonlyField label="Listing status" value={listing.status} />
          <ReadonlyField label="Seller" value={listing.seller.name} />
          <ReadonlyField label="Seller status" value={listing.seller.status} />
          <ReadonlyField label="Seller verification" value={listing.seller.verification_status} />
        </div>
        <p style={{ marginTop: "0.6rem" }}>
          <Link href={`/admin/sellers/${listing.seller.id}`}>Open the seller</Link>
          {" · "}
          <Link href={`/admin/wishlists?listing=${listing.id}`}>Who else saved it</Link>
          {" · "}
          <Link href={`/admin/carts?listing=${listing.id}`}>Carts holding it</Link>
        </p>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Saved by</h2>
        <BuyerCell buyer={fav.buyer} />
        <p className={styles.secondaryText} style={{ marginTop: "0.6rem" }}>
          {fav.buyer.phone} · Wallet {formatMoney(fav.buyer.wallet_balance)} · Account{" "}
          {fav.buyer.status}
        </p>
        <p style={{ marginTop: "0.6rem" }}>
          <Link href={`/admin/wishlists?buyer=${fav.buyer.id}`}>Wishlist of this buyer</Link>
          {" · "}
          <Link href={`/admin/carts?buyer=${fav.buyer.id}`}>Carts of this buyer</Link>
        </p>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Record</h2>
        <div className={styles.formGrid}>
          <ReadonlyField label="Saved" value={formatDateTime(fav.created_at)} />
          <ReadonlyField label="Saved by" value={actorLabel(fav.creator_name, fav.creator_type)} />
          <ReadonlyField label="Last changed" value={formatDateTime(fav.updated_at)} />
          <ReadonlyField label="Changed by" value={actorLabel(fav.updater_name, fav.updater_type)} />
        </div>
      </section>
    </div>
  );
}
