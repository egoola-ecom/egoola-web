"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartDetail, CartLine, getCart } from "@/lib/admin-carts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { BuyerCell, ListingThumb, actorLabel, formatDateTime } from "../../_shared/buyer-cell";
import { ReadonlyField, formatMoney } from "../../_shared/readonly-field";
import styles from "../../management.module.css";

/** Colour and size when there are any, else the SKU code. */
function variantOf(line: CartLine): string {
  const parts = [line.color, line.size].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  return line.listing_sku.sku ?? "—";
}

export function CartDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);
    getCart(id)
      .then((detail) => {
        if (!cancelled) setCart(detail);
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
            ? "This cart does not exist."
            : "Couldn't load this cart. Please try again.",
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
  if (loadError || !cart) {
    return <p className={styles.errorBanner}>{loadError ?? "Cart not found."}</p>;
  }

  const isService = cart.cart_type === "service";

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/carts")}>
        ← Back to Carts
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Cart #{cart.id}</h1>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.badge} ${styles.badgeBlue}`}>{cart.cart_type}</span>
            <span
              className={`${styles.badge} ${cart.is_active ? styles.badgeGreen : styles.badgeGray}`}
            >
              {cart.is_active ? "Open" : "Closed"}
            </span>
            {cart.order != null && (
              <span className={styles.secondaryText}>Order #{cart.order}</span>
            )}
          </div>
        </div>
      </div>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Buyer</h2>
        <BuyerCell buyer={cart.buyer} />
        <p className={styles.secondaryText} style={{ marginTop: "0.6rem" }}>
          {cart.buyer.phone} · Wallet {formatMoney(cart.buyer.wallet_balance)} · Account{" "}
          {cart.buyer.status}
        </p>
        <p style={{ marginTop: "0.6rem" }}>
          <Link href={`/admin/carts?buyer=${cart.buyer.id}`}>All carts of this buyer</Link>
          {" · "}
          <Link href={`/admin/wishlists?buyer=${cart.buyer.id}`}>Wishlist of this buyer</Link>
        </p>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Items ({cart.item_count})</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Variant</th>
                <th>{isService ? "Duration" : "Qty"}</th>
                <th>Unit price</th>
                <th>Line subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.stateRow}>
                    This cart has no items.
                  </td>
                </tr>
              ) : (
                cart.items.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <div className={styles.thumbCell}>
                        <ListingThumb url={line.listing.image_url} />
                        <div>
                          <div className={styles.primaryText}>{line.listing.title}</div>
                          <div className={styles.secondaryText}>
                            {line.listing.catalog_type} · #{line.listing.id}
                          </div>
                          {!line.available && (
                            <span
                              className={`${styles.badge} ${styles.badgeAmber}`}
                              title="The SKU is inactive, the listing is no longer approved, or stock can no longer cover the quantity."
                            >
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {variantOf(line)}
                      {!line.listing_sku.is_active && (
                        <div className={styles.secondaryText}>SKU inactive</div>
                      )}
                    </td>
                    <td>{(isService ? line.duration : line.qty) ?? "—"}</td>
                    <td>
                      {formatMoney(line.unit_price)}
                      {line.listing_sku.discounted_price !== line.listing_sku.price && (
                        <div className={styles.strikePrice}>
                          {formatMoney(line.listing_sku.price)}
                        </div>
                      )}
                    </td>
                    <td>{formatMoney(line.line_subtotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.primaryText} style={{ textAlign: "right", marginTop: "0.8rem" }}>
          Subtotal: {formatMoney(cart.subtotal)}
        </p>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Record</h2>
        <div className={styles.formGrid}>
          <ReadonlyField label="Created" value={formatDateTime(cart.created_at)} />
          <ReadonlyField label="Created by" value={actorLabel(cart.creator_name, cart.creator_type)} />
          <ReadonlyField label="Last changed" value={formatDateTime(cart.updated_at)} />
          <ReadonlyField label="Changed by" value={actorLabel(cart.updater_name, cart.updater_type)} />
        </div>
      </section>
    </div>
  );
}
