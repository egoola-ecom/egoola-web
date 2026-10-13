"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { usePendingListingCount } from "@/lib/pending-listing-count";
import { useSellerRequestCount } from "@/lib/seller-request-count";
import { useAuthGuard } from "@/lib/use-auth-guard";
import styles from "./admin-shell.module.css";

const SELLER_REQUESTS_HREF = "/admin/sellers/requests";
const SELLERS_HREF = "/admin/sellers";
const CATALOG_HREF = "/admin/catalog";
const LISTINGS_HREF = "/admin/catalog/listings";
const PENDING_LISTINGS_HREF = "/admin/catalog/listings/requests";

/** Which waiting-count a menu entry shows as a badge. */
type Badge = "sellerRequests" | "pendingListings";

interface NavChild {
  href: string;
  label: string;
  badge?: Badge;
}

/** One menu entry. A group has no page of its own: it only opens its
 * children. `prefix` is the path the group's pages live under, so the group
 * stays open while one of them is shown. */
type NavItem =
  | { href: string; label: string; superAdminOnly?: boolean }
  | { label: string; key: string; prefix: string; children: NavChild[] };

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/admins", label: "Admins", superAdminOnly: true },
  {
    label: "Sellers",
    key: "sellers",
    prefix: SELLERS_HREF,
    children: [
      { href: SELLER_REQUESTS_HREF, label: "Seller Requests", badge: "sellerRequests" },
      { href: SELLERS_HREF, label: "Seller List" },
    ],
  },
  { href: "/admin/buyers", label: "Buyers" },
  { href: "/admin/geography", label: "Geography" },
  { href: CATALOG_HREF, label: "Catalog" },
  {
    label: "Listings",
    key: "listings",
    prefix: LISTINGS_HREF,
    children: [
      { href: PENDING_LISTINGS_HREF, label: "Pending Listings", badge: "pendingListings" },
      { href: LISTINGS_HREF, label: "All Listings" },
    ],
  },
  { href: "/admin/cms", label: "CMS" },
];

/** A parent entry must not light up while a sibling page that lives under its
 * path is open: "Seller List" vs Seller Requests, "Catalog" and "All Listings"
 * vs the listing pages and the pending list. */
function isNavActive(pathname: string, href: string): boolean {
  if (href === SELLERS_HREF) {
    return pathname.startsWith(href) && !pathname.startsWith(SELLER_REQUESTS_HREF);
  }
  if (href === CATALOG_HREF) {
    return pathname.startsWith(href) && !pathname.startsWith(LISTINGS_HREF);
  }
  if (href === LISTINGS_HREF) {
    return pathname.startsWith(href) && !pathname.startsWith(PENDING_LISTINGS_HREF);
  }
  return pathname.startsWith(href);
}

function NavGroupView({
  item,
  pathname,
  counts,
  open,
  onToggle,
}: {
  item: Extract<NavItem, { children: NavChild[] }>;
  pathname: string;
  counts: Record<Badge, number | null>;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const inGroup = pathname.startsWith(item.prefix);
  // A collapsed group shows what is waiting inside it on its own row.
  const waiting = item.children.reduce(
    (sum, child) => sum + (child.badge ? (counts[child.badge] ?? 0) : 0),
    0,
  );
  const panelId = `nav-${item.key}`;
  return (
    <div>
      <button
        type="button"
        className={`${styles.navLink} ${styles.navGroup} ${inGroup ? styles.navGroupActive : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(!open)}
      >
        <span>
          {item.label}
          {!open && waiting > 0 && <span className={styles.navCount}>{waiting}</span>}
        </span>
        <span
          className={`${styles.navChevron} ${open ? styles.navChevronOpen : ""}`}
          aria-hidden="true"
        >
          ▸
        </span>
      </button>
      {open && (
        <div id={panelId} className={styles.navSub}>
          {item.children.map((child) => {
            const count = child.badge ? counts[child.badge] : null;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`${styles.navLink} ${styles.navSubLink} ${
                  isNavActive(pathname, child.href) ? styles.navLinkActive : ""
                }`}
              >
                {child.label}
                {count != null && count > 0 && <span className={styles.navCount}>{count}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, checked } = useAuthGuard("admin", "/admin/login");
  const ready = checked && Boolean(session);
  const counts: Record<Badge, number | null> = {
    sellerRequests: useSellerRequestCount(ready),
    pendingListings: usePendingListingCount(ready),
  };
  // A group follows the page: it is open while one of its pages is shown.
  // Once the admin clicks it, their choice wins.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  if (!checked || !session) {
    return <div className={styles.checking}>Checking session…</div>;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logoRow}>
          <span className={styles.logo}>
            <span className={styles.logoDark}>eg</span>
            <span className={styles.logoGreen}>oola</span>
          </span>
          <span className={styles.badge}>Admin Panel</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.filter(
            // Admin Management is super-admin only: a plain admin gets 403 on
            // every /accounts/admins/ call, so the link is not shown at all.
            (item) =>
              !("superAdminOnly" in item && item.superAdminOnly) ||
              session.admin_type !== "admin",
          ).map((item) =>
            "children" in item ? (
              <NavGroupView
                key={item.key}
                item={item}
                pathname={pathname}
                counts={counts}
                open={toggled[item.key] ?? pathname.startsWith(item.prefix)}
                onToggle={(open) => setToggled({ ...toggled, [item.key]: open })}
              />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${
                  isNavActive(pathname, item.href) ? styles.navLinkActive : ""
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.userName}>{session.name}</span>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => {
              logout("admin");
              router.replace("/admin/login");
            }}
          >
            Log out
          </button>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
