"use client";

import { useState } from "react";
import {
  ListingStatus,
  ListingStatusChangeLog,
  ListingStatusInput,
} from "@/lib/listing-api";
import { FieldErrors } from "@/lib/use-managed-list";
import {
  formatDateTime,
  statusBadgeClass,
  statusLabel,
  statusNeedsNote,
} from "./listing-utils";
import styles from "../../management.module.css";

const DECISIONS: { status: ListingStatus; label: string; className: string }[] = [
  { status: "approved", label: "Approve", className: styles.submitButton },
  { status: "changes_requested", label: "Request changes", className: styles.cancelButton },
  { status: "rejected", label: "Reject", className: styles.dangerButton },
];

/** What the panel needs: a listing or a gig has the same moderation fields. */
export interface ModerationSubject {
  status: ListingStatus;
  note: string | null;
  status_change_logs: ListingStatusChangeLog[];
}

/** Listing Details section for moderation: approve, request changes or reject
 * (the last two need a note), see the current note, and read the full status
 * history, newest first. Mirrors the backend's PATCH `status` / `note` flow and
 * the append-only `status_change_logs` (docs/listing-complete-guide.md §8).
 * A note is only read when the status really changes, so a decision that
 * repeats the current status is disabled. */
export function ListingModerationPanel({
  listing,
  fieldErrors,
  formError,
  submitting,
  onSubmit,
  noun = "listing",
}: {
  listing: ModerationSubject;
  /** What it is called in the messages: "listing" or "gig". */
  noun?: string;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onSubmit: (input: ListingStatusInput) => void;
}) {
  const [note, setNote] = useState("");
  const [otherStatus, setOtherStatus] = useState<"" | "draft" | "pending">("");
  const [localError, setLocalError] = useState<string | null>(null);

  function decide(status: ListingStatus) {
    const trimmed = note.trim();
    if (statusNeedsNote(status) && !trimmed) {
      setLocalError(
        status === "rejected"
          ? `Write a note explaining why this ${noun} is rejected.`
          : "Write a note telling the owner what to change.",
      );
      return;
    }
    setLocalError(null);
    const input: ListingStatusInput = { status };
    if (trimmed) input.note = trimmed;
    onSubmit(input);
  }

  const shownError = localError ?? formError;
  // Logs come newest first; sort defensively so the order never depends on it.
  const logs = [...listing.status_change_logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Moderation</h2>

      <div className={styles.verificationCurrent}>
        <span className={`${styles.badge} ${statusBadgeClass(listing.status)}`}>
          {statusLabel(listing.status)}
        </span>
        {listing.note ? (
          <span className={styles.secondaryText}>Latest note: {listing.note}</span>
        ) : (
          <span className={styles.secondaryText}>No note on the latest change.</span>
        )}
      </div>

      <div className={styles.field} style={{ marginTop: "0.75rem" }}>
        <label className={styles.label} htmlFor="moderation-note">
          Note (required to reject or request changes)
        </label>
        <textarea
          id="moderation-note"
          className={styles.textarea}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {(fieldErrors.note?.[0] || fieldErrors.status?.[0]) && (
          <p className={styles.fieldError}>{fieldErrors.note?.[0] ?? fieldErrors.status?.[0]}</p>
        )}
        <p className={styles.fieldHint}>
          The note is saved with the status change. Choosing the status the {noun} already has
          changes nothing.
        </p>
      </div>
      {shownError && <p className={styles.errorBanner}>{shownError}</p>}

      <div className={styles.formActions} style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {DECISIONS.map((decision) => (
          <button
            key={decision.status}
            type="button"
            className={decision.className}
            disabled={submitting || listing.status === decision.status}
            onClick={() => decide(decision.status)}
          >
            {decision.label}
          </button>
        ))}
        <span className={styles.secondaryText}>or move back to</span>
        <select
          className={styles.filterSelect}
          aria-label={`Move this ${noun} back to`}
          value={otherStatus}
          disabled={submitting}
          onChange={(event) => {
            const next = event.target.value as "" | "draft" | "pending";
            setOtherStatus("");
            if (next && next !== listing.status) decide(next);
          }}
        >
          <option value="">Choose…</option>
          <option value="pending" disabled={listing.status === "pending"}>
            Pending
          </option>
          <option value="draft" disabled={listing.status === "draft"}>
            Draft
          </option>
        </select>
      </div>

      <h3 className={styles.detailCardSubtitle}>Status change history</h3>
      {logs.length === 0 ? (
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
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.codeText}>{formatDateTime(log.created_at)}</td>
                  <td>
                    <span className={`${styles.badge} ${statusBadgeClass(log.status)}`}>
                      {statusLabel(log.status)}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>{log.note ?? "—"}</td>
                  <td className={styles.secondaryText}>
                    {log.creator_name} ({log.creator_type})
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
