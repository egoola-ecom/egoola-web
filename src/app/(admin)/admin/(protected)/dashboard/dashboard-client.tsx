"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listAdmins, listBuyers, listSellers } from "@/lib/accounts-api";
import { getSession } from "@/lib/auth";
import { listBanners } from "@/lib/cms-api";
import { listListings } from "@/lib/listing-api";
import styles from "./dashboard.module.css";

// ---------------------------------------------------------------------------
// INTERIM dashboard.
//
// The backend has no dashboard API yet, so every number here is a `count` read
// from an existing list endpoint with `?limit=1` (one row is fetched, only the
// total is used). When the real aggregated dashboard endpoint ships, replace
// this file's data loading with a single call to it — the tiles can stay.
// ---------------------------------------------------------------------------

interface Stat {
  key: string;
  label: string;
  href: string;
  load: () => Promise<{ count: number }>;
}

function countOf(
  fetcher: (params: URLSearchParams) => Promise<{ count: number }>,
  filters: Record<string, string> = {},
) {
  return () => fetcher(new URLSearchParams({ limit: "1", ...filters }));
}

const ATTENTION: Stat[] = [
  {
    key: "sellers-pending",
    label: "Sellers waiting for verification review",
    href: "/admin/sellers",
    load: countOf(listSellers, { verification_status: "pending" }),
  },
  {
    key: "sellers-unverified",
    label: "Sellers not yet verified",
    href: "/admin/sellers",
    load: countOf(listSellers, { verification_status: "unverified" }),
  },
  {
    key: "listings-pending",
    label: "Listings waiting for moderation",
    href: "/admin/catalog/listings/requests",
    load: countOf(listListings, { status: "pending" }),
  },
  {
    key: "listings-changes",
    label: "Listings with changes requested",
    href: "/admin/catalog/listings?status=changes_requested",
    load: countOf(listListings, { status: "changes_requested" }),
  },
];

const TOTALS: Stat[] = [
  { key: "buyers", label: "Buyers", href: "/admin/buyers", load: countOf(listBuyers) },
  { key: "sellers", label: "Sellers", href: "/admin/sellers", load: countOf(listSellers) },
  { key: "listings", label: "Listings", href: "/admin/catalog/listings", load: countOf(listListings) },
  {
    key: "banners",
    label: "Banners live now",
    href: "/admin/cms",
    load: countOf(listBanners, { active_now: "true" }),
  },
  // Admin Management is super-admin only, so a plain admin has no count to show.
  { key: "admins", label: "Admins", href: "/admin/admins", load: countOf(listAdmins) },
];

type Counts = Record<string, number | "error" | undefined>;

function StatTile({ stat, value }: { stat: Stat; value: number | "error" | undefined }) {
  return (
    <Link href={stat.href} className={styles.stat}>
      <span className={styles.statValue}>
        {value === undefined ? "…" : value === "error" ? "—" : value.toLocaleString()}
      </span>
      <span className={styles.statLabel}>
        {stat.label}
        {value === "error" && " (couldn't load)"}
      </span>
    </Link>
  );
}

export function DashboardClient() {
  const [counts, setCounts] = useState<Counts>({});
  const [isPlainAdmin] = useState(() => getSession("admin")?.admin_type === "admin");

  useEffect(() => {
    let cancelled = false;
    const all = [...ATTENTION, ...TOTALS].filter((s) => !(isPlainAdmin && s.key === "admins"));
    for (const stat of all) {
      stat
        .load()
        .then((page) => {
          if (!cancelled) setCounts((prev) => ({ ...prev, [stat.key]: page.count }));
        })
        .catch(() => {
          if (!cancelled) setCounts((prev) => ({ ...prev, [stat.key]: "error" }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isPlainAdmin]);

  const totals = TOTALS.filter((stat) => !(isPlainAdmin && stat.key === "admins"));

  return (
    <div>
      <h1 className={styles.heading}>Admin Dashboard</h1>
      <p className={styles.subheading}>
        A quick look at what needs an admin&apos;s attention, and the size of the platform.
      </p>
      <p className={styles.interimNote}>
        Interim dashboard: these numbers are counted from the existing lists. They will be replaced
        by the real dashboard once the backend provides it.
      </p>

      <h2 className={styles.groupTitle}>Needs attention</h2>
      <div className={styles.statGrid}>
        {ATTENTION.map((stat) => (
          <StatTile key={stat.key} stat={stat} value={counts[stat.key]} />
        ))}
      </div>

      <h2 className={styles.groupTitle}>Platform totals</h2>
      <div className={styles.statGrid}>
        {totals.map((stat) => (
          <StatTile key={stat.key} stat={stat} value={counts[stat.key]} />
        ))}
      </div>
    </div>
  );
}
