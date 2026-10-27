"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { usePendingGigCount } from "@/lib/pending-gig-count";
import { usePendingListingCount } from "@/lib/pending-listing-count";
import { useSellerRequestCount } from "@/lib/seller-request-count";
import { useAuthGuard } from "@/lib/use-auth-guard";
import styles from "./admin-shell.module.css";

const SELLER_REQUESTS_HREF = "/admin/sellers/requests";
const SELLERS_HREF = "/admin/sellers";
const CATALOG_HREF = "/admin/catalog";
const LISTINGS_HREF = "/admin/catalog/listings";
const PENDING_LISTINGS_HREF = "/admin/catalog/listings/requests";
const GIGS_HREF = "/admin/gigs";
const PENDING_GIGS_HREF = "/admin/gigs/requests";

/** Which waiting-count a menu entry shows as a badge. */
type Badge = "sellerRequests" | "pendingListings" | "pendingGigs";

interface NavLeaf {
  href: string;
  label: string;
  badge?: Badge;
}

/** A group has no page of its own: it only opens its children, which are
 * links or groups again (Listing > Product > List). `prefixes` are the paths
 * its pages live under, so the group stays open while one of them is shown. */
interface NavGroup {
  label: string;
  key: string;
  prefixes: string[];
  children: (NavLeaf | NavGroup)[];
}

type NavItem = { href: string; label: string; superAdminOnly?: boolean } | NavGroup;

function isGroup(item: NavLeaf | NavGroup | NavItem): item is NavGroup {
  return "children" in item;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/admins", label: "Admins", superAdminOnly: true },
  {
    label: "Sellers",
    key: "sellers",
    prefixes: [SELLERS_HREF],
    children: [
      { href: SELLER_REQUESTS_HREF, label: "Seller Requests", badge: "sellerRequests" },
      { href: SELLERS_HREF, label: "Seller List" },
    ],
  },
  { href: "/admin/buyers", label: "Buyers" },
  { href: "/admin/carts", label: "Carts" },
  { href: "/admin/wishlists", label: "Wishlists" },
  { href: "/admin/geography", label: "Geography" },
  { href: CATALOG_HREF, label: "Catalog" },
  {
    label: "Listing",
    key: "listing",
    prefixes: [LISTINGS_HREF, GIGS_HREF],
    children: [
      {
        label: "Product",
        key: "listing-product",
        prefixes: [LISTINGS_HREF],
        children: [
          { href: LISTINGS_HREF, label: "List" },
          { href: PENDING_LISTINGS_HREF, label: "Requested Products", badge: "pendingListings" },
        ],
      },
      {
        label: "Gig",
        key: "listing-gig",
        prefixes: [GIGS_HREF],
        children: [
          { href: GIGS_HREF, label: "Gigs List" },
          { href: PENDING_GIGS_HREF, label: "Requested Gigs", badge: "pendingGigs" },
        ],
      },
    ],
  },
  { href: "/admin/cms", label: "CMS" },
];

/** A parent entry must not light up while a sibling page that lives under its
 * path is open: "Seller List" vs Seller Requests, "Catalog" and "All Listings"
 * vs the listing pages and the pending list, "Gigs List" vs Requested Gigs. */
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
  if (href === GIGS_HREF) {
    return pathname.startsWith(href) && !pathname.startsWith(PENDING_GIGS_HREF);
  }
  return pathname.startsWith(href);
}

/** What is waiting inside a group (all levels): shown on its row while it is
 * collapsed. */
function waitingIn(group: NavGroup, counts: Record<Badge, number | null>): number {
  return group.children.reduce(
    (sum, child) =>
      sum +
      (isGroup(child)
        ? waitingIn(child, counts)
        : child.badge
          ? (counts[child.badge] ?? 0)
          : 0),
    0,
  );
}

function NavGroupView({
  item,
  pathname,
  counts,
  toggled,
  onToggle,
  depth = 0,
}: {
  item: NavGroup;
  pathname: string;
  counts: Record<Badge, number | null>;
  /** The groups the admin opened or closed by hand; the rest follow the page. */
  toggled: Record<string, boolean>;
  onToggle: (key: string, open: boolean) => void;
  depth?: number;
}) {
  const inGroup = item.prefixes.some((prefix) => pathname.startsWith(prefix));
  const open = toggled[item.key] ?? inGroup;
  const waiting = waitingIn(item, counts);
  const panelId = `nav-${item.key}`;
  return (
    <div>
      <button
        type="button"
        className={`${styles.navLink} ${styles.navGroup} ${depth > 0 ? styles.navSubLink : ""} ${
          inGroup ? styles.navGroupActive : ""
        }`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(item.key, !open)}
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
            if (isGroup(child)) {
              return (
                <NavGroupView
                  key={child.key}
                  item={child}
                  pathname={pathname}
                  counts={counts}
                  toggled={toggled}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              );
            }
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
    pendingGigs: usePendingGigCount(ready),
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
            isGroup(item) ? (
              <NavGroupView
                key={item.key}
                item={item}
                pathname={pathname}
                counts={counts}
                toggled={toggled}
                onToggle={(key, open) => setToggled({ ...toggled, [key]: open })}
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
