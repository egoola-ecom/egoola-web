"use client";

import { useState } from "react";
import {
  SellerDetail,
  SellerReviewInput,
  SellerStatus,
  SellerVerificationStatus,
} from "@/lib/accounts-api";
import { FieldErrors } from "@/lib/use-managed-list";
import {
  ACCESS_TIER_LABELS,
  ACCESS_TIER_TEXT,
  STATUS_LABELS,
  VERIFICATION_LABELS,
  accessTier,
  accessTierBadgeClass,
  accountStatusBlock,
  formatDateTime,
  statusBadgeClass,
  verificationBadgeClass,
  verificationBlock,
  wasEverVerified,
} from "./seller-badges";
import styles from "../management.module.css";

const VERIFICATIONS: SellerVerificationStatus[] = ["unverified", "pending", "verified", "rejected"];
const ACCOUNT_STATUSES: SellerStatus[] = ["active", "inactive", "suspended"];

/** What the account status becomes when the verification changes, or null when
 * it is left alone (backend rule 3). */
function sideEffect(
  target: SellerVerificationStatus,
  status: SellerStatus,
): { text: string; status?: SellerStatus } | null {
  if (target === "pending") {
    return status === "inactive" ? null : { text: "The account status becomes Inactive." };
  }
  if (target === "rejected") {
    return status === "suspended" ? null : { text: "The account status becomes Suspended." };
  }
  if (target === "unverified" && status === "active") {
    return { text: "An Unverified seller cannot be Active, so the account status becomes Inactive.", status: "inactive" };
  }
  return null;
}

/** Seller Details section where an admin sets the two statuses of a seller and
 * reads the change history (the oldest entry is the registration itself).
 * The buttons carry the status names exactly: the four Verification statuses
 * (Unverified, Pending, Verified, Rejected) and the three Account statuses
 * (Active, Inactive, Suspended). They are separate switches on purpose.
 * Rules from docs/admin/seller-verification-guide.md:
 *  - A Rejected seller can only move to Pending.
 *  - A seller who has ever been Verified can never be Rejected.
 *  - Pending makes the account Inactive, Rejected makes it Suspended, an
 *    Unverified seller cannot be Active; a Verified one is free.
 *  - Rejected needs a note. Any real change leaves the Seller Request queue.
 * The server enforces all of it; the screen switches off what it knows will be
 * refused and says why. */
export function VerificationPanel({
  seller,
  fieldErrors,
  formError,
  submitting,
  onSubmit,
}: {
  seller: SellerDetail;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onSubmit: (input: SellerReviewInput) => void;
}) {
  const [target, setTarget] = useState<SellerVerificationStatus | null>(null);
  const [note, setNote] = useState("");
  const [noteMissing, setNoteMissing] = useState(false);
  const [alsoActive, setAlsoActive] = useState(true);

  const everVerified = wasEverVerified(seller);
  const tier = accessTier(seller);

  function openVerification(next: SellerVerificationStatus) {
    setTarget(next);
    setNote("");
    setNoteMissing(false);
    setAlsoActive(seller.status !== "active");
  }

  function confirmVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    const text = note.trim();
    if (target === "rejected" && !text) {
      setNoteMissing(true);
      return;
    }
    const input: SellerReviewInput = { verification_status: target };
    if (text) input.verification_note = text;
    if (target === "verified" && alsoActive && seller.status !== "active") input.status = "active";
    const effect = sideEffect(target, seller.status);
    if (effect?.status) input.status = effect.status;
    onSubmit(input);
  }

  function setAccountStatus(next: SellerStatus) {
    const verified = seller.verification_status === "verified";
    const lockedText = verified
      ? "They can still log in and see their account, but are fully locked: they cannot change anything, not even their profile."
      : "They can still log in and change their profile, but cannot use seller features.";
    const words: Record<SellerStatus, string> = {
      active: `Set "${seller.name}" to Active? They can use the full seller features.`,
      inactive: `Set "${seller.name}" to Inactive? ${lockedText} Set Active again to restore access.`,
      suspended: `Set "${seller.name}" to Suspended? ${lockedText} Set Active again to restore access.`,
    };
    if (!window.confirm(words[next])) return;
    onSubmit({ status: next });
  }

  const verificationReasons = new Set<string>();
  const statusReasons = new Set<string>();
  const effect = target ? sideEffect(target, seller.status) : null;

  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Review</h2>

      {seller.is_seller_request && (
        <p className={styles.requestBanner}>
          {seller.verification_status === "pending"
            ? `This seller was rejected, fixed their application and resubmitted it on ${new Date(
                seller.requested_at ?? seller.created_at,
              ).toLocaleDateString()}.`
            : `This seller signed up on ${new Date(
                seller.requested_at ?? seller.created_at,
              ).toLocaleDateString()} and is waiting for a decision.`}{" "}
          Check the documents below, then set the verification to Verified or Rejected. Until the
          seller is Verified and Active, they can log in but can only change their own profile.
        </p>
      )}

      <div className={styles.verificationCurrent}>
        <span className={styles.secondaryText}>Verification</span>
        <span
          className={`${styles.badge} ${verificationBadgeClass(seller.verification_status)}`}
          data-testid="current-verification"
        >
          {VERIFICATION_LABELS[seller.verification_status]}
        </span>
        <span className={styles.secondaryText}>Account status</span>
        <span className={`${styles.badge} ${statusBadgeClass(seller.status)}`} data-testid="current-status">
          {STATUS_LABELS[seller.status]}
        </span>
        <span className={styles.secondaryText}>Access</span>
        <span
          className={`${styles.badge} ${accessTierBadgeClass(tier)}`}
          data-testid="current-tier"
        >
          {ACCESS_TIER_LABELS[tier]}
        </span>
        {seller.verification_note && (
          <span className={styles.secondaryText}>{seller.verification_note}</span>
        )}
      </div>
      <p className={styles.fieldHint} data-testid="tier-text">
        Every account status can log in. {ACCESS_TIER_TEXT[tier]}
      </p>

      {formError && (
        <p className={styles.errorBanner} role="alert" data-testid="review-error">
          {formError}
        </p>
      )}

      <p className={styles.label}>Verification</p>
      <div className={styles.reviewActions} data-testid="verification-buttons">
        {VERIFICATIONS.map((value) => {
          const current = seller.verification_status === value;
          const reason = verificationBlock(seller.verification_status, value, everVerified);
          if (reason) verificationReasons.add(reason);
          return (
            <button
              key={value}
              type="button"
              className={
                value === "verified"
                  ? styles.approveButton
                  : value === "rejected"
                    ? styles.dangerButton
                    : styles.actionButton
              }
              aria-pressed={current}
              data-testid={`verify-${value}`}
              disabled={submitting || current || reason !== null || target === value}
              title={current ? "This is the current verification status." : (reason ?? undefined)}
              onClick={() => openVerification(value)}
            >
              {VERIFICATION_LABELS[value]}
            </button>
          );
        })}
      </div>
      {seller.verification_status === "rejected" && (
        <p className={styles.fieldHint} data-testid="rejected-login-hint">
          A Rejected seller is Suspended but can still log in and change their profile and documents,
          then press Resubmit. Resubmit sets the verification to Pending and the account to Inactive,
          and puts them back in the Seller Request queue.
        </p>
      )}
      {[...verificationReasons].map((reason) => (
        <p key={reason} className={styles.fieldHint} data-testid="verification-reason">
          {reason}
        </p>
      ))}

      {target && (
        <form className={styles.rejectBox} onSubmit={confirmVerification} data-testid="verification-form">
          <p className={styles.label}>
            Set the verification to {VERIFICATION_LABELS[target]}
          </p>
          {effect && (
            <p className={styles.fieldHint} data-testid="verification-effect">
              {effect.text}
            </p>
          )}
          {target === "verified" && seller.status !== "active" && (
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={alsoActive}
                onChange={(event) => setAlsoActive(event.target.checked)}
                data-testid="also-active"
              />
              <span>Also set the account status to Active, so the seller can use the full seller features</span>
            </label>
          )}
          <label className={styles.label} htmlFor="verification_note">
            {target === "rejected"
              ? "Note (required). The seller sees it, and it is kept in the history."
              : "Note (optional)"}
          </label>
          <textarea
            id="verification_note"
            className={styles.textarea}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={target === "rejected" ? "For example: the NID photo is unreadable." : undefined}
            autoFocus
          />
          {noteMissing && <p className={styles.fieldError}>A note is required when rejecting.</p>}
          {fieldErrors.verification_note?.[0] && (
            <p className={styles.fieldError}>{fieldErrors.verification_note[0]}</p>
          )}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={submitting}
              onClick={() => setTarget(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={target === "rejected" ? styles.dangerButton : styles.submitButton}
              disabled={submitting}
              data-testid="verification-confirm"
            >
              {submitting ? "Saving…" : `Set ${VERIFICATION_LABELS[target]}`}
            </button>
          </div>
        </form>
      )}

      <p className={styles.label} style={{ marginTop: "1rem" }}>
        Account status
      </p>
      <div className={styles.reviewActions} data-testid="status-buttons">
        {ACCOUNT_STATUSES.map((value) => {
          const current = seller.status === value;
          const reason = accountStatusBlock(seller.verification_status, value);
          if (reason && !current) statusReasons.add(reason);
          return (
            <button
              key={value}
              type="button"
              className={styles.actionButton}
              aria-pressed={current}
              data-testid={`status-${value}`}
              disabled={submitting || current || reason !== null}
              title={current ? "This is the current account status." : (reason ?? undefined)}
              onClick={() => setAccountStatus(value)}
            >
              {STATUS_LABELS[value]}
            </button>
          );
        })}
      </div>
      {[...statusReasons].map((reason) => (
        <p key={reason} className={styles.fieldHint} data-testid="status-reason">
          {reason}
        </p>
      ))}

      <p className={styles.fieldHint} data-testid="rules-note">
        Rules: Rejected can only move to Pending. A seller who has ever been Verified can never be
        Rejected. Pending makes the account Inactive, Rejected makes it Suspended, and an
        Unverified seller cannot be Active. Any change of verification or account status takes
        the seller out of the Seller Request queue.
      </p>

      <h3 className={styles.detailCardSubtitle}>Status change history</h3>
      {seller.verification_logs.length === 0 ? (
        <p className={styles.stateRow}>No history yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Status</th>
                <th>Note</th>
                <th>Changed by</th>
              </tr>
            </thead>
            <tbody>
              {seller.verification_logs.map((log, index) => (
                <tr key={log.id}>
                  <td className={styles.codeText}>{formatDateTime(log.created_at)}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${verificationBadgeClass(log.verification_status)}`}
                    >
                      {VERIFICATION_LABELS[log.verification_status]}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>{log.verification_note ?? "—"}</td>
                  <td className={styles.secondaryText}>
                    {log.creator_name} ({log.creator_type}
                    {log.creator_type === "seller"
                      ? index === seller.verification_logs.length - 1
                        ? " — sign-up"
                        : " — resubmitted"
                      : ""}
                    )
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
