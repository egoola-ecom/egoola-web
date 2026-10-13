"use client";

import { useState } from "react";
import { SellerDetail, SellerReviewInput, SellerVerificationStatus } from "@/lib/accounts-api";
import { FieldErrors } from "@/lib/use-managed-list";
import {
  STATUS_LABELS,
  formatDateTime,
  statusBadgeClass,
  verificationBadgeClass,
} from "./seller-badges";
import styles from "../management.module.css";

const STATUS_OPTIONS: { value: SellerVerificationStatus; label: string }[] = [
  { value: "unverified", label: "Unverified" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

/** Seller Details section where an admin decides on the seller and reads the
 * change history (the oldest entry is the registration itself). Mirrors the
 * backend rules in docs/seller-onboarding-guide.md:
 *  - Approve = ONE request with BOTH `verification_status: "verified"` and
 *    `status: "active"` — `status: active` is what lets the seller log in.
 *  - Reject needs a note (400 without one, and nothing changes).
 *  - Mark pending, Pause / Activate and Suspend change ONE field each.
 *    `status` is the account switch and is separate from the KYC decision:
 *    Pause (`inactive`) keeps a verified seller approved, and does not put
 *    them back in the queue.
 * Approve, Reject, Mark pending and Suspend take the seller out of the Seller
 * Request queue (any REAL change to verification_status or status does). */
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
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectMissing, setRejectMissing] = useState(false);

  const [manualStatus, setManualStatus] = useState<SellerVerificationStatus>(
    seller.verification_status,
  );
  const [manualNote, setManualNote] = useState(seller.verification_note ?? "");

  const approved = seller.verification_status === "verified" && seller.status === "active";

  function approve() {
    if (
      !window.confirm(
        `Approve "${seller.name}"? They are marked verified and set active, so they can use the full seller features.`,
      )
    ) {
      return;
    }
    onSubmit({ verification_status: "verified", status: "active" });
  }

  function confirmReject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = rejectNote.trim();
    if (!note) {
      setRejectMissing(true);
      return;
    }
    setRejectMissing(false);
    onSubmit({ verification_status: "rejected", verification_note: note });
  }

  function pause() {
    if (
      !window.confirm(
        `Pause "${seller.name}"? They stay approved and can still log in and edit their profile, but cannot use seller features until you activate them again.`,
      )
    ) {
      return;
    }
    onSubmit({ status: "inactive" });
  }

  function activate() {
    const verified = seller.verification_status === "verified";
    if (
      !window.confirm(
        verified
          ? `Activate "${seller.name}"? They can use the full seller features again.`
          : `Activate "${seller.name}"? They are not verified yet, so they still cannot use seller features until you approve them.`,
      )
    ) {
      return;
    }
    onSubmit({ status: "active" });
  }

  function suspend() {
    if (
      !window.confirm(
        `Suspend "${seller.name}"? They will not be able to log in at all until you activate them.`,
      )
    ) {
      return;
    }
    onSubmit({ status: "suspended" });
  }

  function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: SellerReviewInput = { verification_status: manualStatus };
    const note = manualNote.trim();
    if (note) input.verification_note = note;
    onSubmit(input);
  }

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
          Check the documents below, then approve or reject. Until you approve, the seller can
          log in but can only edit their own profile.
        </p>
      )}

      <div className={styles.verificationCurrent}>
        <span className={`${styles.badge} ${verificationBadgeClass(seller.verification_status)}`}>
          {seller.verification_status}
        </span>
        <span className={`${styles.badge} ${statusBadgeClass(seller.status)}`}>
          {STATUS_LABELS[seller.status]}
        </span>
        {seller.verification_note && (
          <span className={styles.secondaryText}>{seller.verification_note}</span>
        )}
      </div>

      {formError && <p className={styles.errorBanner}>{formError}</p>}

      <div className={styles.reviewActions}>
        <button
          type="button"
          className={styles.approveButton}
          disabled={submitting || approved}
          onClick={approve}
        >
          Approve
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          disabled={submitting || rejecting}
          onClick={() => setRejecting(true)}
        >
          Reject…
        </button>
        <button
          type="button"
          className={styles.actionButton}
          disabled={submitting || seller.verification_status === "pending"}
          onClick={() => onSubmit({ verification_status: "pending" })}
        >
          Mark pending
        </button>
        {seller.status === "active" && (
          <button type="button" className={styles.actionButton} disabled={submitting} onClick={pause}>
            Pause
          </button>
        )}
        {seller.status !== "active" && (
          <button
            type="button"
            className={styles.actionButton}
            disabled={submitting}
            onClick={activate}
          >
            Activate
          </button>
        )}
        {seller.status !== "suspended" && (
          <button
            type="button"
            className={styles.actionButton}
            disabled={submitting}
            onClick={suspend}
          >
            Suspend
          </button>
        )}
      </div>

      {rejecting && (
        <form className={styles.rejectBox} onSubmit={confirmReject}>
          <label className={styles.label} htmlFor="reject_note">
            Why is this seller rejected? The note is kept in the seller&apos;s history.
          </label>
          <textarea
            id="reject_note"
            className={styles.textarea}
            value={rejectNote}
            onChange={(event) => setRejectNote(event.target.value)}
            placeholder="For example: the NID photo is unreadable."
            autoFocus
          />
          {rejectMissing && (
            <p className={styles.fieldError}>A note is required when rejecting.</p>
          )}
          {fieldErrors.verification_note?.[0] && (
            <p className={styles.fieldError}>{fieldErrors.verification_note[0]}</p>
          )}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={submitting}
              onClick={() => {
                setRejecting(false);
                setRejectMissing(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className={styles.dangerButton} disabled={submitting}>
              {submitting ? "Rejecting…" : "Reject seller"}
            </button>
          </div>
        </form>
      )}

      <details className={styles.manualStatus}>
        <summary>Set the verification status by hand</summary>
        <form onSubmit={submitManual}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="verification_status">
                New status
              </label>
              <select
                id="verification_status"
                className={styles.select}
                value={manualStatus}
                onChange={(event) =>
                  setManualStatus(event.target.value as SellerVerificationStatus)
                }
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label} htmlFor="verification_note">
                Note{manualStatus === "rejected" ? " (required when rejecting)" : " (optional)"}
              </label>
              <textarea
                id="verification_note"
                className={styles.textarea}
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
                required={manualStatus === "rejected"}
              />
              {!rejecting && fieldErrors.verification_note?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.verification_note[0]}</p>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Updating…" : "Update Verification"}
            </button>
          </div>
        </form>
      </details>

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
                      {log.verification_status}
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
