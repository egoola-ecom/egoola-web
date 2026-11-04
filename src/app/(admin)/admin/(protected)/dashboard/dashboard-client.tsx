"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/components/order-status";
import { DashboardSummary, getDashboardSummary } from "@/lib/admin-dashboard-api";
import { AuthError, clearSession } from "@/lib/auth";
import { formatMoney } from "../_shared/readonly-field";
import management from "../management.module.css";
import styles from "./dashboard.module.css";

interface Tile {
  key: string;
  label: string;
  href: string;
  value: string;
}

const count = (n: number) => n.toLocaleString();

function attentionTiles(s: DashboardSummary): Tile[] {
  const a = s.needs_attention;
  return [
    { key: "sellers-pending", label: "Sellers waiting for verification review", href: "/admin/sellers", value: count(a.sellers_pending_review) },
    { key: "sellers-unverified", label: "Sellers not yet verified", href: "/admin/sellers", value: count(a.sellers_unverified) },
    { key: "listings-pending", label: "Product listings waiting for moderation", href: "/admin/catalog/listings/requests", value: count(a.listings_pending) },
    { key: "listings-changes", label: "Product listings with changes requested", href: "/admin/catalog/listings?status=changes_requested", value: count(a.listings_changes_requested) },
    { key: "gigs-pending", label: "Gigs waiting for moderation", href: "/admin/gigs/requests", value: count(a.gigs_pending) },
    { key: "gigs-changes", label: "Gigs with changes requested", href: "/admin/gigs?status=changes_requested", value: count(a.gigs_changes_requested) },
    { key: "orders-pending", label: "Orders waiting for the seller", href: "/admin/orders?status=pending", value: count(a.orders_pending) },
    { key: "orders-disputed", label: "Orders in dispute", href: "/admin/orders?status=disputed", value: count(a.orders_disputed) },
  ];
}

function totalTiles(s: DashboardSummary): Tile[] {
  const t = s.totals;
  const tiles: Tile[] = [
    { key: "buyers", label: "Buyers", href: "/admin/buyers", value: count(t.buyers) },
    { key: "sellers", label: "Sellers", href: "/admin/sellers", value: count(t.sellers) },
    { key: "listings", label: "Product listings", href: "/admin/catalog/listings", value: count(t.listings) },
    { key: "gigs", label: "Gigs", href: "/admin/gigs", value: count(t.gigs) },
    { key: "banners", label: "Banners live now", href: "/admin/cms", value: count(t.banners_live) },
  ];
  // Only a super-admin gets a number. A plain admin gets null: no tile.
  if (t.admins !== null) tiles.push({ key: "admins", label: "Admins", href: "/admin/admins", value: count(t.admins) });
  return tiles;
}

function orderTiles(s: DashboardSummary): Tile[] {
  const o = s.orders;
  return [
    { key: "orders-today", label: "Orders placed today", href: "/admin/orders", value: count(o.today) },
    { key: "orders-month", label: "Orders placed this month", href: "/admin/orders", value: count(o.this_month) },
    { key: "paid-month", label: "Paid this month", href: "/admin/orders", value: formatMoney(o.revenue.paid_this_month) },
    { key: "due", label: "Still to be collected", href: "/admin/orders", value: formatMoney(o.revenue.due_outstanding) },
  ];
}

function marketTiles(s: DashboardSummary): Tile[] {
  const m = s.marketplace;
  return [
    { key: "carts", label: "Open carts", href: "/admin/carts", value: count(m.open_carts) },
    { key: "jobs", label: "Jobs open for bids", href: "/admin/jobs", value: count(m.jobs_open_for_bidding) },
    { key: "bids", label: "Bids waiting for the buyer", href: "/admin/bidding", value: count(m.bids_pending) },
  ];
}

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className={styles.statGrid}>
      {tiles.map((tile) => (
        <Link key={tile.key} href={tile.href} className={styles.stat} data-testid={`tile-${tile.key}`}>
          <span className={styles.statValue}>{tile.value}</span>
          <span className={styles.statLabel}>{tile.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function DashboardClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return getDashboardSummary()
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof AuthError) {
          clearSession("admin");
          router.replace("/admin/login");
          return;
        }
        // Keep the last numbers on screen if there are any.
        setError("Couldn't load the dashboard. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const updated = summary
    ? new Date(summary.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={styles.heading}>Admin Dashboard</h1>
          <p className={styles.subheading}>
            A quick look at what needs an admin&apos;s attention, and the size of the platform.
          </p>
        </div>
        <div>
          {updated && (
            <span className={management.secondaryText} data-testid="dashboard-updated">
              Updated {updated}{" "}
            </span>
          )}
          <button type="button" className={management.actionButton} onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className={management.errorBanner} role="alert" data-testid="dashboard-error">
          {error}
        </p>
      )}
      {!summary && loading && <p className={management.stateRow}>Loading…</p>}

      {summary && (
        <>
          <h2 className={styles.groupTitle}>Needs attention</h2>
          <TileGrid tiles={attentionTiles(summary)} />

          <h2 className={styles.groupTitle}>Orders</h2>
          <TileGrid tiles={orderTiles(summary)} />
          <div className={styles.statusRow} data-testid="orders-by-status">
            {ALL_ORDER_STATUSES.map((status) => (
              <Link key={status} href={`/admin/orders?status=${status}`} className={styles.statusChip}>
                {ORDER_STATUS_LABEL[status]} <strong>{count(summary.orders.by_status[status] ?? 0)}</strong>
              </Link>
            ))}
          </div>

          <h2 className={styles.groupTitle}>Marketplace</h2>
          <TileGrid tiles={marketTiles(summary)} />

          <h2 className={styles.groupTitle}>Platform totals</h2>
          <TileGrid tiles={totalTiles(summary)} />
        </>
      )}
    </div>
  );
}
