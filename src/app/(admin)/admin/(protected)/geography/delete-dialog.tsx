"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { ApiError, apiErrorDetail } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import styles from "../management.module.css";

/** The server answers a delete of a place that addresses, orders or listings
 * still use with a 500 and no message (a ProtectedError it does not catch).
 * Nothing is lost when that happens, so say what it most likely means. */
function deleteProblem(err: unknown, noun: string): string {
  const detail = apiErrorDetail(err);
  if (detail) return detail;
  if (err instanceof ApiError && err.status >= 500) {
    return `This ${noun} is probably still used by saved addresses, orders or listings, so it cannot be deleted. Nothing was changed.`;
  }
  return `Couldn't delete this ${noun}. Please try again.`;
}

/** Asks first, then deletes, and keeps the dialog open with the reason when
 * the delete is refused. `onDelete` does the call and refreshes the list. A
 * sign-in that ended is handed to `onAuthError`. */
export function DeleteDialog({
  noun,
  name,
  warning,
  onDelete,
  onAuthError,
  onClose,
}: {
  noun: string;
  name: string;
  warning: string;
  onDelete: () => Promise<void>;
  onAuthError: (err: unknown) => boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      if (err instanceof AuthError && onAuthError(err)) return;
      setError(deleteProblem(err, noun));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Delete ${noun}`} onClose={() => !busy && onClose()}>
      <p className={styles.fieldHint}>
        Delete {noun} &ldquo;{name}&rdquo;? {warning} This cannot be undone.
      </p>
      {error && (
        <p className={styles.fieldError} role="alert" data-testid="delete-error">
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelButton} onClick={onClose} disabled={busy}>
          {error ? "Close" : "Keep it"}
        </button>
        {!error && (
          <button type="button" className={styles.dangerButton} onClick={() => void confirm()} disabled={busy} data-testid="confirm-delete">
            {busy ? "Deleting…" : `Delete ${noun}`}
          </button>
        )}
      </div>
    </Modal>
  );
}
