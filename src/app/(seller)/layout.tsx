"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ActorTopbar } from "@/components/actor-topbar";
import admin from "@/app/(admin)/admin/(protected)/admin-shell.module.css";
import styles from "@/components/seller-form/seller-form.module.css";
import { AuthError, clearSession, logout } from "@/lib/auth";
import { SellerMe, getSellerMe } from "@/lib/seller-me-api";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { describeError } from "@/lib/use-managed-list";
import { SellerContext } from "./seller/seller-context";
import shell from "./seller-shell.module.css";

/** The banner for a seller who cannot operate yet. It is chosen from the TWO
 * separate switches — `verification_status` (the KYC decision) and `status`
 * (the account switch). `inactive` alone never means "not approved": a
 * verified seller can be inactive because an admin paused the account. */
function StatusBanner({ me }: { me: SellerMe }) {
  if (me.can_operate) return null;

  if (me.verification_status === "rejected") {
    return (
      <div className={`${styles.statusBanner} ${styles.statusDanger}`} role="status">
        <div>
          <strong>Your application was rejected.</strong>
          {me.verification_note && <div>Reason: {me.verification_note}</div>}
        </div>
        <Link href="/seller/profile#resubmit" className={styles.secondaryLink}>
          Fix and resubmit
        </Link>
      </div>
    );
  }

  if (me.verification_status === "verified") {
    // Verified but not Active: paused (Inactive) or Suspended by an admin.
    // This is the Locked tier: nothing can be changed, not even the profile.
    return (
      <div className={`${styles.statusBanner} ${styles.statusWarn}`} role="status">
        {me.status === "suspended"
          ? "Your account is suspended. You can look at your account, but you cannot change anything until an admin makes it active again."
          : "Your account is paused. You can look at your account, but you cannot change anything until an admin makes it active again."}
      </div>
    );
  }

  // unverified or pending
  return (
    <div className={`${styles.statusBanner} ${styles.statusInfo}`} role="status">
      Your application is under review. You can edit your profile while you wait.
    </div>
  );
}

const LISTING_HREF = "/seller/listings";
const GIGS_HREF = "/seller/gigs";
const JOBS_HREF = "/seller/jobs";
const BIDS_HREF = "/seller/bids";
const ORDERS_HREF = "/seller/orders";

const JOBS_MINE_HREF = `${JOBS_HREF}/mine`;
const ORDERS_GIGS_HREF = `${ORDERS_HREF}/gigs`;

interface NavLeaf {
  href: string;
  label: string;
}

/** A group has no page of its own: it only opens its children. `prefixes` are
 * the paths its pages live under, so it stays open while one of them is shown. */
interface NavGroup {
  label: string;
  key: string;
  prefixes: string[];
  children: NavLeaf[];
}

type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

/** What a seller who can operate sees. Everyone else gets only the last two
 * entries (see `SellerLayout`). */
const OPERATE_NAV: NavItem[] = [
  { href: "/seller", label: "Dashboard" },
  {
    label: "Listing",
    key: "listing",
    prefixes: [LISTING_HREF, GIGS_HREF],
    children: [
      { href: LISTING_HREF, label: "Product" },
      { href: GIGS_HREF, label: "Gigs" },
    ],
  },
  {
    label: "Jobs",
    key: "jobs",
    prefixes: [JOBS_HREF, BIDS_HREF],
    children: [
      { href: JOBS_HREF, label: "Job board" },
      { href: JOBS_MINE_HREF, label: "My jobs" },
      { href: BIDS_HREF, label: "My bids" },
    ],
  },
  {
    label: "Orders",
    key: "orders",
    prefixes: [ORDERS_HREF],
    children: [
      { href: ORDERS_HREF, label: "Products" },
      { href: ORDERS_GIGS_HREF, label: "Gigs" },
    ],
  },
];

const ACCOUNT_NAV: NavItem[] = [
  { href: "/seller/profile", label: "My profile" },
  { href: "/seller/password", label: "Password" },
];

/** "Job board" also covers a job's own page; "Dashboard" is only /seller. */
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/seller") return pathname === href;
  if (href === JOBS_HREF) {
    return pathname.startsWith(href) && !pathname.startsWith(JOBS_MINE_HREF);
  }
  // Product orders (and each order's own page) are under /seller/orders; gig orders have their own page.
  if (href === ORDERS_HREF) {
    return pathname.startsWith(href) && !pathname.startsWith(ORDERS_GIGS_HREF);
  }
  return pathname.startsWith(href);
}

export default function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, checked } = useAuthGuard("seller", "/login");
  const [me, setMeState] = useState<SellerMe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof AuthError) {
        clearSession("seller");
        router.replace("/login");
        return true;
      }
      return false;
    },
    [router],
  );

  const reload = useCallback(async () => {
    try {
      const data = await getSellerMe();
      setMeState(data);
      setLoadError(null);
      return data;
    } catch (err) {
      if (!handleAuthError(err)) setLoadError(describeError(err));
      return null;
    }
  }, [handleAuthError]);

  useEffect(() => {
    // Always ask the server: the stored switches may be out of date (an admin
    // may have approved, paused or suspended this seller since login).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (checked && session) void reload();
  }, [checked, session, reload]);

  if (!checked || !session) {
    return <div className={shell.state}>Checking session…</div>;
  }

  if (!me) {
    return (
      <div>
        <ActorTopbar session={session} actorType="seller" loginPath="/login" />
        <div className={shell.state}>{loadError ?? "Loading your account…"}</div>
      </div>
    );
  }

  // Everything that is not the seller's own profile needs verified AND active.
  const items = [...(me.can_operate ? OPERATE_NAV : []), ...ACCOUNT_NAV];

  function renderLeaf(leaf: NavLeaf, sub: boolean) {
    return (
      <Link
        key={leaf.href}
        href={leaf.href}
        className={`${admin.navLink} ${sub ? admin.navSubLink : ""} ${
          isNavActive(pathname, leaf.href) ? admin.navLinkActive : ""
        }`}
      >
        {leaf.label}
      </Link>
    );
  }

  return (
    <SellerContext.Provider value={{ me, setMe: setMeState, reload, handleAuthError }}>
      <div className={admin.shell}>
        <aside className={admin.sidebar}>
          <div className={admin.logoRow}>
            <span className={admin.logo}>
              <span className={admin.logoDark}>eg</span>
              <span className={admin.logoGreen}>oola</span>
            </span>
            <span className={admin.badge}>Seller Panel</span>
          </div>
          <nav className={admin.nav} aria-label="Seller sections">
            {items.map((item) => {
              if (!isGroup(item)) return renderLeaf(item, false);
              const inGroup = item.prefixes.some((prefix) => pathname.startsWith(prefix));
              // A group follows the page until the seller clicks it.
              const open = toggled[item.key] ?? inGroup;
              return (
                <div key={item.key}>
                  <button
                    type="button"
                    className={`${admin.navLink} ${admin.navGroup} ${
                      inGroup ? admin.navGroupActive : ""
                    }`}
                    aria-expanded={open}
                    aria-controls={`nav-${item.key}`}
                    onClick={() => setToggled({ ...toggled, [item.key]: !open })}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`${admin.navChevron} ${open ? admin.navChevronOpen : ""}`}
                      aria-hidden="true"
                    >
                      ▸
                    </span>
                  </button>
                  {open && (
                    <div id={`nav-${item.key}`} className={admin.navSub}>
                      {item.children.map((child) => renderLeaf(child, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className={admin.main}>
          <header className={admin.topbar}>
            <span className={admin.userName}>{me.name}</span>
            <button
              type="button"
              className={admin.logoutButton}
              onClick={() => {
                logout("seller");
                router.replace("/login");
              }}
            >
              Log out
            </button>
          </header>
          <main className={admin.content}>
            <StatusBanner me={me} />
            {children}
          </main>
        </div>
      </div>
    </SellerContext.Provider>
  );
}
