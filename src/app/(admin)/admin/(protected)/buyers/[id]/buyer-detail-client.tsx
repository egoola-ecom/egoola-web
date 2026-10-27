"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BuyerDetail, getBuyer } from "@/lib/accounts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { formatMoney } from "../../_shared/readonly-field";
import { initials } from "../../_shared/profile-sections";
import { BuyerProfileView } from "../buyer-profile-view";
import styles from "../../management.module.css";

export function BuyerDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);

    getBuyer(id)
      .then((detail) => {
        if (!cancelled) setBuyer(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AuthError) {
          clearSession("admin");
          router.replace("/admin/login");
          return;
        }
        setLoadError("Couldn't load this buyer. Please try again.");
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
  if (loadError || !buyer) {
    return <p className={styles.errorBanner}>{loadError ?? "Buyer not found."}</p>;
  }

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/buyers")}>
        ← Back to Buyers
      </button>

      <div className={styles.detailHeader}>
        <span className={styles.avatarLg}>
          {buyer.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(buyer.profile_pic_url) ?? undefined} alt="" />
          ) : (
            initials(buyer.name)
          )}
        </span>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>{buyer.name}</h1>
          <p className={styles.subtitle}>
            {buyer.email} · {buyer.phone}
          </p>
          <div className={styles.detailBadgeRow}>
            <span
              className={`${styles.badge} ${buyer.status === "active" ? styles.badgeGreen : styles.badgeRed}`}
            >
              {buyer.status}
            </span>
            <span className={styles.secondaryText}>
              Wallet {formatMoney(buyer.wallet_balance)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => router.push(`/admin/carts?buyer=${id}`)}
        >
          Carts
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => router.push(`/admin/wishlists?buyer=${id}`)}
        >
          Wishlist
        </button>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => router.push(`/admin/buyers/${id}/edit`)}
        >
          Update
        </button>
      </div>

      <BuyerProfileView buyer={buyer} />
    </div>
  );
}
