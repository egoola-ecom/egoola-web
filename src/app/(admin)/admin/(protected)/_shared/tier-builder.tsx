"use client";

import { formatAmount } from "../catalog/listings/listing-utils";
import {
  TIER_PRICE_TYPES,
  TierProblems,
  TierRow,
  blankTier,
  firstFreeType,
} from "./tier-model";
import styles from "../management.module.css";

function unitOf(type: TierRow["priceType"]): string {
  return TIER_PRICE_TYPES.find((opt) => opt.value === type)?.unit ?? "";
}

/** The rows of a job's budget or a bid's quote: a price type, the price, (bid
 * only) how many units it covers, and a note. A saved row cannot be removed
 * (the server never deletes a tier); a new row can. Problems are shown beside
 * the row they belong to; `serverErrors` is keyed "<listKey>.<index>.<field>"
 * and reaches the row through `sentRowKeys` (the key of each item sent). */
export function TierBuilder({
  rows,
  onChange,
  withDuration,
  listKey,
  fieldErrors,
  sentRowKeys,
  problems,
  idPrefix,
}: {
  rows: TierRow[];
  onChange: (rows: TierRow[]) => void;
  withDuration: boolean;
  /** "skus" for a job, "price_tiers" for a bid. */
  listKey: string;
  fieldErrors: Record<string, string[] | undefined>;
  sentRowKeys: string[];
  problems: TierProblems | null;
  idPrefix: string;
}) {
  const free = firstFreeType(rows);

  function patch(key: string, changes: Partial<TierRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  function serverError(rowKey: string, field: string): string | undefined {
    const index = sentRowKeys.indexOf(rowKey);
    return index < 0 ? undefined : fieldErrors[`${listKey}.${index}.${field}`]?.[0];
  }

  const general = problems?.general ?? fieldErrors[listKey]?.find((m) => !m.startsWith("Row "));

  return (
    <div>
      {general && <p className={styles.fieldError}>{general}</p>}
      <div className={styles.skuCards}>
        {rows.map((row, index) => {
          const mine = problems?.rows[row.key];
          const typeError = mine?.priceType ?? serverError(row.key, "price_type");
          const priceError = mine?.price ?? serverError(row.key, "price");
          const durationError = mine?.duration ?? serverError(row.key, "duration");
          const fixed = row.priceType === "fixed";
          const total =
            withDuration && Number(row.price) >= 0 && row.price.trim() !== ""
              ? Number(row.price) * (fixed ? 1 : Number(row.duration) || 0)
              : null;
          return (
            <div key={row.key} className={styles.skuCard}>
              <div className={styles.skuCardHead}>
                <span className={styles.skuCardTitle}>
                  {withDuration ? "Price option" : "Budget"} {index + 1}
                  {row.id != null ? "" : " (new)"}
                </span>
                {row.id == null && rows.length > 1 && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className={styles.skuCardBody}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${idPrefix}-type-${row.key}`}>
                    Price type
                  </label>
                  <select
                    id={`${idPrefix}-type-${row.key}`}
                    className={styles.select}
                    value={row.priceType}
                    onChange={(event) =>
                      patch(row.key, { priceType: event.target.value as TierRow["priceType"] })
                    }
                  >
                    {TIER_PRICE_TYPES.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.value !== row.priceType && rows.some((r) => r.priceType === opt.value)}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {typeError && <p className={styles.fieldError}>{typeError}</p>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${idPrefix}-price-${row.key}`}>
                    Price (৳){unitOf(row.priceType) ? ` per ${unitOf(row.priceType)}` : ""}
                  </label>
                  <input
                    id={`${idPrefix}-price-${row.key}`}
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(event) => patch(row.key, { price: event.target.value })}
                  />
                  {priceError && <p className={styles.fieldError}>{priceError}</p>}
                </div>
                {withDuration && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`${idPrefix}-duration-${row.key}`}>
                      Duration (units)
                    </label>
                    <input
                      id={`${idPrefix}-duration-${row.key}`}
                      className={styles.input}
                      type="number"
                      min="1"
                      step="1"
                      disabled={fixed}
                      value={fixed ? "1" : row.duration}
                      onChange={(event) => patch(row.key, { duration: event.target.value })}
                    />
                    {durationError && <p className={styles.fieldError}>{durationError}</p>}
                    {total != null && (
                      <p className={styles.fieldHint}>Total: {formatAmount(String(total))}</p>
                    )}
                  </div>
                )}
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label} htmlFor={`${idPrefix}-desc-${row.key}`}>
                    Note (optional)
                  </label>
                  <input
                    id={`${idPrefix}-desc-${row.key}`}
                    className={styles.input}
                    value={row.description}
                    onChange={(event) => patch(row.key, { description: event.target.value })}
                  />
                  {serverError(row.key, "description") && (
                    <p className={styles.fieldError}>{serverError(row.key, "description")}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.addRowButton}
        disabled={free == null}
        onClick={() => free && onChange([...rows, blankTier(free)])}
      >
        {free == null ? "All five price types are used" : "+ Add another price type"}
      </button>
    </div>
  );
}
