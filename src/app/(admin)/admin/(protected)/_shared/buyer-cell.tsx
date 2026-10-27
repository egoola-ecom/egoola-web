"use client";

import Link from "next/link";
import type { AdminBuyerSummary } from "@/lib/admin-carts-api";
import { resolveMediaUrl } from "@/lib/env";
import { initials } from "./profile-sections";
import styles from "../management.module.css";

/** Avatar, name and email of a buyer, linked to the buyer's own admin page. */
export function BuyerCell({ buyer }: { buyer: AdminBuyerSummary }) {
  return (
    <div className={styles.nameCell}>
      <span className={styles.avatar}>
        {buyer.profile_pic_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveMediaUrl(buyer.profile_pic_url) ?? undefined} alt="" />
        ) : (
          initials(buyer.name)
        )}
      </span>
      <div>
        <div className={styles.primaryText}>
          <Link href={`/admin/buyers/${buyer.id}`}>{buyer.name}</Link>
        </div>
        <div className={styles.secondaryText}>{buyer.email}</div>
      </div>
    </div>
  );
}

/** Small round or square picture of a listing, or nothing when it has none. */
export function ListingThumb({ url }: { url: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className={styles.thumb} src={resolveMediaUrl(url) ?? undefined} alt="" /> : (
    <span className={styles.thumb} />
  );
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}

/** "Rafiq (user)" style line for a created_by / updated_by pair. */
export function actorLabel(name: string | null, type: string | null): string {
  if (!name) return "—";
  return type ? `${name} (${type})` : name;
}
