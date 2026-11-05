"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ActorTopbar } from "@/components/actor-topbar";
import styles from "@/components/seller-form/seller-form.module.css";
import { AuthError, clearSession } from "@/lib/auth";
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

/** The second row under the Jobs tab. */
const JOBS_SUBTABS = [
  { href: JOBS_HREF, label: "Job board" },
  { href: `${JOBS_HREF}/mine`, label: "My jobs" },
  { href: BIDS_HREF, label: "My bids" },
];

/** The second row under the Listing tab. A new product or gig is made with the
 * Create button on its own list page, so there are no extra entries. */
const LISTING_SUBTABS = [
  { href: LISTING_HREF, label: "Product" },
  { href: GIGS_HREF, label: "Gigs" },
];

export default function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, checked } = useAuthGuard("seller", "/login");
  const [me, setMeState] = useState<SellerMe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const tabs = [
    ...(me.can_operate
      ? [
          { href: "/seller", label: "Dashboard" },
          // "Listing" opens Product; Product and Gigs are its second row.
          { href: LISTING_HREF, label: "Listing" },
          { href: JOBS_HREF, label: "Jobs" },
          { href: ORDERS_HREF, label: "Orders" },
        ]
      : []),
    { href: "/seller/profile", label: "My profile" },
    { href: "/seller/password", label: "Password" },
  ];

  const inListing = pathname.startsWith(LISTING_HREF) || pathname.startsWith(GIGS_HREF);
  const inJobs = pathname.startsWith(JOBS_HREF) || pathname.startsWith(BIDS_HREF);
  const inOrders = pathname.startsWith(ORDERS_HREF);
  // The job board's own page and a job's page are both "Job board"; My jobs and
  // My bids have their own paths.
  const jobsSubtabActive = (tab: (typeof JOBS_SUBTABS)[number]) =>
    tab.href === JOBS_HREF
      ? inJobs && !pathname.startsWith(`${JOBS_HREF}/mine`) && !pathname.startsWith(BIDS_HREF)
      : pathname.startsWith(tab.href);

  return (
    <SellerContext.Provider value={{ me, setMe: setMeState, reload, handleAuthError }}>
      <ActorTopbar
        session={{ ...session, name: me.name }}
        actorType="seller"
        loginPath="/login"
      />
      <div className={shell.page}>
        <div className={`${shell.wrap} ${inListing || inJobs || inOrders ? shell.wrapWide : ""}`}>
          <StatusBanner me={me} />
          <nav className={shell.tabs} aria-label="Seller sections">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${shell.tab} ${
                  (tab.href === "/seller"
                    ? pathname === "/seller"
                    : tab.href === LISTING_HREF
                      ? inListing
                      : tab.href === JOBS_HREF
                        ? inJobs
                        : pathname.startsWith(tab.href))
                    ? shell.tabActive
                    : ""
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {inListing && me.can_operate && (
            <nav className={shell.subTabs} aria-label="Listing sections">
              {LISTING_SUBTABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`${shell.subTab} ${
                    pathname.startsWith(tab.href) ? shell.subTabActive : ""
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
          {inJobs && me.can_operate && (
            <nav className={shell.subTabs} aria-label="Job sections">
              {JOBS_SUBTABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`${shell.subTab} ${jobsSubtabActive(tab) ? shell.subTabActive : ""}`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
          {children}
        </div>
      </div>
    </SellerContext.Provider>
  );
}
