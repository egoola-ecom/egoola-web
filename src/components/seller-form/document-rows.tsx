"use client";

import { useRef, useState } from "react";
import {
  REGISTER_DOCUMENT_TYPES,
  REGISTER_MAX_FILES,
  REGISTER_MAX_FILE_BYTES,
  RegisterMediaFor,
} from "@/lib/seller-register-api";
import styles from "./seller-form.module.css";
import login from "@/app/(public)/login/login.module.css";

export const MEDIA_FOR_OPTIONS: { value: RegisterMediaFor; label: string }[] = [
  { value: "nid", label: "NID" },
  { value: "birth_certificate", label: "Birth certificate" },
  { value: "certificate", label: "Certificate / trade licence" },
  { value: "other", label: "Other" },
];

/** Kinds a verified seller can no longer add or remove. */
export const IDENTITY_KINDS: RegisterMediaFor[] = ["nid", "birth_certificate"];

export const FILE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

export interface DocRow {
  id: number;
  mediaFor: RegisterMediaFor;
  file: File | null;
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** The first reason a file cannot be sent, or null when it is fine. The server
 * checks the same rules and stays the authority. */
export function fileProblem(file: File, allowed: string[], allowedText: string): string | null {
  if (!allowed.includes(file.type)) {
    return `${file.name}: only ${allowedText} files are accepted.`;
  }
  if (file.size > REGISTER_MAX_FILE_BYTES) {
    return `${file.name}: each file must be 5 MB or smaller.`;
  }
  return null;
}

function without(record: Record<number, string>, id: number): Record<number, string> {
  const copy = { ...record };
  delete copy[id];
  return copy;
}

/**
 * State for a list of "kind + file" rows (sign-up documents, or new documents
 * on the seller's profile). `kinds` limits what the kind dropdown offers.
 * `validate()` checks every row and returns true when all are fine.
 */
export function useDocumentRows(
  initial: DocRow[],
  kinds: { value: RegisterMediaFor; label: string }[] = MEDIA_FOR_OPTIONS,
) {
  const nextId = useRef(initial.reduce((max, row) => Math.max(max, row.id), 0) + 1);
  const [rows, setRows] = useState<DocRow[]>(initial);
  const [errors, setErrors] = useState<Record<number, string>>({});

  function update(id: number, patch: Partial<DocRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setErrors((current) => without(current, id));
  }

  function add(mediaFor?: RegisterMediaFor) {
    setRows((current) =>
      current.length >= REGISTER_MAX_FILES
        ? current
        : [
            ...current,
            { id: nextId.current++, mediaFor: mediaFor ?? kinds[0]?.value ?? "other", file: null },
          ],
    );
  }

  function remove(id: number) {
    setRows((current) => current.filter((row) => row.id !== id));
    setErrors((current) => without(current, id));
  }

  function reset() {
    setRows([]);
    setErrors({});
  }

  /** Every row needs a file of an accepted type and size. */
  function validate(): boolean {
    const problems: Record<number, string> = {};
    for (const row of rows) {
      if (!row.file) {
        problems[row.id] = "Choose a file, or remove this row.";
        continue;
      }
      const problem = fileProblem(row.file, REGISTER_DOCUMENT_TYPES, "JPG, PNG, WEBP or PDF");
      if (problem) problems[row.id] = problem;
    }
    setErrors(problems);
    return Object.keys(problems).length === 0;
  }

  return { rows, errors, kinds, update, add, remove, reset, validate };
}

/** The rows themselves: a kind dropdown, a file picker and a Remove button. */
export function DocumentRows({
  docs,
  addLabel = "+ Add another document",
  minRows = 1,
}: {
  docs: ReturnType<typeof useDocumentRows>;
  addLabel?: string;
  /** Rows that cannot be removed (the sign-up form always keeps one). */
  minRows?: number;
}) {
  const { rows, errors, kinds } = docs;
  return (
    <div className={styles.docList}>
      {rows.map((row, index) => (
        <div key={row.id}>
          <div className={styles.docRow}>
            <select
              className={login.input}
              aria-label={`Document ${index + 1} type`}
              value={row.mediaFor}
              onChange={(event) =>
                docs.update(row.id, { mediaFor: event.target.value as RegisterMediaFor })
              }
            >
              {kinds.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className={styles.docFile}>
              <input
                type="file"
                className={styles.fileInput}
                aria-label={`Document ${index + 1} file`}
                accept={FILE_ACCEPT}
                onChange={(event) => docs.update(row.id, { file: event.target.files?.[0] ?? null })}
              />
              {row.file && (
                <p className={styles.fileMeta}>
                  {row.file.name} · {formatSize(row.file.size)}
                </p>
              )}
            </div>
            {rows.length > minRows && (
              <button type="button" className={styles.linkButton} onClick={() => docs.remove(row.id)}>
                Remove
              </button>
            )}
          </div>
          {errors[row.id] && (
            <p className={styles.fieldError} role="alert">
              {errors[row.id]}
            </p>
          )}
        </div>
      ))}
      <button
        type="button"
        className={styles.addButton}
        disabled={rows.length >= REGISTER_MAX_FILES}
        onClick={() => docs.add()}
      >
        {addLabel}
      </button>
    </div>
  );
}
