"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerDetail, SellerReviewInput, getSeller, updateSellerReview } from "@/lib/accounts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { notifySellerRequestsChanged } from "@/lib/seller-request-count";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { formatMoney } from "../../_shared/readonly-field";
import { STATUS_LABELS, initials, statusBadgeClass } from "../seller-badges";
import { ProfileChangeHistory } from "../profile-change-history";
import { SellerDocuments } from "../seller-documents";
import { SellerProfileView } from "../seller-profile-view";
import { VerificationPanel } from "../verification-panel";
import styles from "../../management.module.css";

/** What the admin is told after each decision. */
function describeDecision(input: SellerReviewInput, name: string): string {
  if (input.verification_status === "verified" && input.status === "active") {
    return `${name} is approved and active. They can use the full seller features.`;
  }
  if (input.verification_status === "rejected") return `${name} was rejected. The note is saved.`;
  if (input.verification_status === "pending") return `${name} is marked pending.`;
  if (input.status === "suspended") return `${name} is suspended and cannot log in.`;
  if (input.status === "inactive") {
    return `${name} is paused. They stay approved but cannot use seller features until activated.`;
  }
  if (input.status === "active") return `${name} is active.`;
  return "Saved.";
}

/** `from` is "requests" when the admin came from the Seller Request queue, so
 * "Back" returns there. */
export function SellerDetailClient({ id, from }: { id: number; from?: string }) {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationFieldErrors, setVerificationFieldErrors] = useState<FieldErrors>({});
  const [verificationFormError, setVerificationFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const backToRequests = from === "requests";
  const backHref = backToRequests ? "/admin/sellers/requests" : "/admin/sellers";

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);

    getSeller(id)
      .then((detail) => {
        if (!cancelled) setSeller(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handleAuthError(err)) {
          setLoadError("Couldn't load this seller. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDecision(input: SellerReviewInput) {
    setVerificationSubmitting(true);
    setVerificationFieldErrors({});
    setVerificationFormError(null);
    setNotice(null);
    try {
      const updated = await updateSellerReview(id, input);
      setSeller(updated);
      setNotice(describeDecision(input, updated.name));
      // The seller has left the queue: the menu badge counts again.
      notifySellerRequestsChanged();
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors, message } = parseFieldErrors(err);
        setVerificationFieldErrors(fieldErrors);
        setVerificationFormError(
          message ?? Object.values(fieldErrors).flat().filter(Boolean).join(" "),
        );
      }
    } finally {
      setVerificationSubmitting(false);
    }
  }

  if (loading) {
    return <p className={styles.stateRow}>Loading…</p>;
  }

  if (loadError || !seller) {
    return <p className={styles.errorBanner}>{loadError ?? "Seller not found."}</p>;
  }

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push(backHref)}>
        {backToRequests ? "← Back to Seller Requests" : "← Back to Sellers"}
      </button>

      <div className={styles.detailHeader}>
        <span className={styles.avatarLg}>
          {seller.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(seller.profile_pic_url) ?? undefined} alt="" />
          ) : (
            initials(seller.name)
          )}
        </span>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>{seller.name}</h1>
          <p className={styles.subtitle}>
            {seller.email} · {seller.phone}
          </p>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.badge} ${statusBadgeClass(seller.status)}`}>
              {STATUS_LABELS[seller.status]}
            </span>
            {seller.is_seller_request && (
              <span className={`${styles.badge} ${styles.badgeAmber}`}>Seller request</span>
            )}
            <span className={styles.secondaryText}>
              Wallet {formatMoney(seller.wallet_balance)} · Bonus{" "}
              {formatMoney(seller.bonus_balance)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => router.push(`/admin/sellers/${id}/edit`)}
        >
          Update
        </button>
      </div>

      {notice && (
        <p className={styles.noticeBanner} role="status">
          {notice}
          {backToRequests && (
            <>
              {" "}
              <button type="button" className={styles.mediaLink} onClick={() => router.push(backHref)}>
                Back to the queue
              </button>
            </>
          )}
        </p>
      )}

      {/* Keyed by the decision state, so the panel's own form fields start
          fresh after every approve / reject / suspend. */}
      <VerificationPanel
        key={`${seller.verification_status}|${seller.status}|${seller.verification_logs.length}`}
        seller={seller}
        fieldErrors={verificationFieldErrors}
        formError={verificationFormError}
        submitting={verificationSubmitting}
        onSubmit={handleDecision}
      />

      <SellerDocuments seller={seller} />

      <SellerProfileView seller={seller} />

      <ProfileChangeHistory logs={seller.profile_change_logs ?? []} />
    </div>
  );
}
