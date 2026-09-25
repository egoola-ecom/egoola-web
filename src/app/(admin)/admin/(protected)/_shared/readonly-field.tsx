"use client";

import styles from "../management.module.css";

/** Displays a backend-computed field (wallet balance, verification status,
 * last login, ...) that this panel can't edit yet — shown so the record's
 * full detail is visible even where there's no write path for it. */
export function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <p className={styles.readonlyValue}>{value}</p>
    </div>
  );
}

export function formatMoney(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `৳${amount.toLocaleString()}` : value;
}

export function formatVerifiedAt(value: string | null): string {
  return value ? `Verified ${new Date(value).toLocaleDateString()}` : "Not verified";
}
