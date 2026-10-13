"use client";

import { useState } from "react";
import { GigPriceType } from "@/lib/gig-api";
import { FieldErrors } from "@/lib/use-managed-list";
import { discountStatus } from "../catalog/listings/sku-model";
import { PRICE_TYPE_OPTIONS, rateText } from "./gig-utils";
import {
  PackageProblems,
  PackageRow,
  blankPackage,
  firstFreePriceType,
  usedPriceTypes,
} from "./package-model";
import styles from "../management.module.css";

const DISCOUNT_LABEL = {
  active: "discount live now",
  scheduled: "discount not started yet",
  expired: "discount ended",
} as const;

/** The server fields the editor shows an error beside; any other error under
 * a row is listed at the foot of its card, so none is swallowed. */
const ROW_FIELDS = [
  "price_type",
  "price",
  "discounted_price",
  "discount_start_date",
  "discount_end_date",
  "description",
  "description_bn",
  "sku",
] as const;

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}

/**
 * The Packages section of the gig form: one card per package (price type, the
 * rate, an optional discount with its window, a description in both languages,
 * an optional code, an active switch). A gig has at most one package per price
 * type — a used type is not offered again, a hidden package still holds its
 * type ("Show it again") and Add package is off once all five are used. A
 * saved package is never deleted, only hidden. There is no stock, no options
 * and no duration here: the buyer chooses the duration when ordering.
 */
export function PackagesEditor({
  mode,
  rows,
  onChange,
  currency,
  fieldErrors,
  sentRowKeys,
  problems,
}: {
  mode: "create" | "edit";
  rows: PackageRow[];
  onChange: (rows: PackageRow[]) => void;
  currency: string;
  fieldErrors: FieldErrors;
  /** Row key of each `skus` item of the last save attempt, so a server error
   * reported by position ("skus.0.price") lands on the right card. */
  sentRowKeys: string[];
  /** Errors found before sending (null until the first save attempt). */
  problems: PackageProblems | null;
}) {
  const [now] = useState(() => Date.now());
  const freeType = firstFreePriceType(rows);

  function update(key: string, patch: Partial<PackageRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function serverRowError(row: PackageRow, field: string): string | undefined {
    const position = sentRowKeys.indexOf(row.key);
    if (position < 0) return undefined;
    return fieldErrors[`skus.${position}.${field}`]?.[0];
  }

  /** Server errors under this row that no field shows. */
  function extraErrors(row: PackageRow): string[] {
    const position = sentRowKeys.indexOf(row.key);
    if (position < 0) return [];
    const prefix = `skus.${position}.`;
    return Object.entries(fieldErrors)
      .filter(
        ([key]) =>
          key.startsWith(prefix) &&
          !(ROW_FIELDS as readonly string[]).includes(key.slice(prefix.length)),
      )
      .flatMap(([key, messages]) => (messages ?? []).map((m) => `${key.slice(prefix.length)}: ${m}`));
  }

  // "Row 1 price: …" lines are the per-row errors again; what is left is the
  // section's own error (two packages with one price type, none on create…).
  const sectionErrors = (fieldErrors.skus ?? []).filter((message) => !/^Row \d+ /.test(message));
  const generalProblem = problems?.general;

  function addPackage() {
    if (freeType) onChange([...rows, blankPackage(freeType)]);
  }

  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className={styles.skuSection}>
      {sectionErrors.map((message) => (
        <p key={message} className={styles.fieldError}>
          {message}
        </p>
      ))}
      {generalProblem && <p className={styles.fieldError}>{generalProblem}</p>}

      <div className={styles.skuSummary}>
        <span>
          <strong>{rows.length}</strong> package{rows.length === 1 ? "" : "s"}
          {rows.length !== activeCount && ` · ${activeCount} active`}
        </span>
        <span className={styles.secondaryText}>
          A gig has one package per price type; the buyer picks how many hours, days, weeks or
          months when ordering.
        </span>
      </div>

      <div className={styles.skuCards}>
        {rows.map((row, index) => {
          const original = row.original;
          const status = original ? discountStatus(original, now) : "none";
          const mine = problems?.rows[row.key] ?? {};
          const idBase = `package-${row.key}`;
          const hasDiscount = row.discountedPrice.trim() !== "";
          const typeInfo = PRICE_TYPE_OPTIONS.find((opt) => opt.value === row.priceType);
          const takenByOthers = usedPriceTypes(rows, row.key);
          const extra = extraErrors(row);
          return (
            <div
              key={row.key}
              className={`${styles.skuCard} ${row.isActive ? "" : styles.skuCardInactive}`}
            >
              <div className={styles.skuCardHead}>
                <div className={styles.skuCardTitle}>
                  {typeInfo ? typeInfo.label : `Package ${index + 1}`}
                </div>
                {original ? (
                  <span className={`${styles.badge} ${styles.badgeGray}`}>Saved</span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeGreen}`}>New</span>
                )}
                {original ? (
                  row.isActive ? (
                    <label className={styles.skuActive}>
                      <input
                        type="checkbox"
                        checked
                        onChange={() => update(row.key, { isActive: false })}
                      />
                      Active
                    </label>
                  ) : (
                    <>
                      <span className={`${styles.badge} ${styles.badgeAmber}`}>Hidden</span>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => update(row.key, { isActive: true })}
                      >
                        Show it again
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <label className={styles.skuActive}>
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(event) => update(row.key, { isActive: event.target.checked })}
                      />
                      Active
                    </label>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className={styles.mediaRemoveToggle}
                        style={{ marginLeft: 0 }}
                        onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                      >
                        Remove
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className={styles.skuCardBody}>
                <Field
                  id={`${idBase}-type`}
                  label="Price type"
                  error={mine.priceType ?? serverRowError(row, "price_type")}
                >
                  <select
                    id={`${idBase}-type`}
                    className={styles.select}
                    value={row.priceType}
                    onChange={(event) =>
                      update(row.key, { priceType: event.target.value as GigPriceType | "" })
                    }
                  >
                    {row.priceType === "" && <option value="">Select price type</option>}
                    {PRICE_TYPE_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={takenByOthers.has(opt.value)}
                      >
                        {opt.label}
                        {takenByOthers.has(opt.value) ? " (already used)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id={`${idBase}-price`}
                  label={`Rate (${currency}, ${typeInfo ? typeInfo.per : "per unit"})`}
                  error={mine.price ?? serverRowError(row, "price")}
                >
                  <input
                    id={`${idBase}-price`}
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(event) => update(row.key, { price: event.target.value })}
                  />
                </Field>
                <Field
                  id={`${idBase}-code`}
                  label="Package code (optional)"
                  error={serverRowError(row, "sku")}
                >
                  <input
                    id={`${idBase}-code`}
                    className={styles.input}
                    value={row.sku}
                    placeholder="e.g. CLEAN-HOURLY"
                    onChange={(event) => update(row.key, { sku: event.target.value })}
                  />
                </Field>

                <div className={styles.skuDiscount}>
                  <Field
                    id={`${idBase}-discount`}
                    label="Discounted rate"
                    error={mine.discountedPrice ?? serverRowError(row, "discounted_price")}
                  >
                    <input
                      id={`${idBase}-discount`}
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      max={row.price || undefined}
                      value={row.discountedPrice}
                      placeholder="No discount"
                      onChange={(event) => {
                        const value = event.target.value;
                        // Dates only mean something with a discount.
                        update(
                          row.key,
                          value.trim() === ""
                            ? { discountedPrice: value, discountStart: "", discountEnd: "" }
                            : { discountedPrice: value },
                        );
                      }}
                    />
                  </Field>
                  <Field
                    id={`${idBase}-start`}
                    label="Discount starts"
                    error={mine.dates ?? serverRowError(row, "discount_start_date")}
                  >
                    <input
                      id={`${idBase}-start`}
                      className={styles.input}
                      type="datetime-local"
                      value={row.discountStart}
                      max={row.discountEnd || undefined}
                      disabled={!hasDiscount}
                      onChange={(event) => update(row.key, { discountStart: event.target.value })}
                    />
                  </Field>
                  <Field
                    id={`${idBase}-end`}
                    label="Discount ends"
                    error={serverRowError(row, "discount_end_date")}
                  >
                    <input
                      id={`${idBase}-end`}
                      className={styles.input}
                      type="datetime-local"
                      value={row.discountEnd}
                      min={row.discountStart || undefined}
                      disabled={!hasDiscount}
                      onChange={(event) => update(row.key, { discountEnd: event.target.value })}
                    />
                  </Field>
                </div>

                <Field
                  id={`${idBase}-desc`}
                  label="Description (optional)"
                  error={serverRowError(row, "description")}
                >
                  <textarea
                    id={`${idBase}-desc`}
                    className={styles.textarea}
                    value={row.description}
                    onChange={(event) => update(row.key, { description: event.target.value })}
                  />
                </Field>
                <Field
                  id={`${idBase}-desc-bn`}
                  label="Description in Bangla (optional)"
                  error={serverRowError(row, "description_bn")}
                >
                  <textarea
                    id={`${idBase}-desc-bn`}
                    className={styles.textarea}
                    lang="bn"
                    value={row.descriptionBn}
                    onChange={(event) => update(row.key, { descriptionBn: event.target.value })}
                  />
                </Field>
              </div>

              {(original || extra.length > 0) && (
                <div className={styles.skuCardFoot}>
                  {original && (
                    <span className={styles.secondaryText}>
                      Charged now{" "}
                      <span className={styles.primaryText}>
                        {rateText(original.effective_price, original.price_type, currency)}
                      </span>
                      {status !== "none" && ` · ${DISCOUNT_LABEL[status]}`}
                    </span>
                  )}
                  {extra.map((message) => (
                    <p key={message} className={styles.fieldError}>
                      {message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.formActions} style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        <button
          type="button"
          className={styles.addRowButton}
          disabled={freeType == null}
          onClick={addPackage}
        >
          + Add package
        </button>
        {freeType == null && (
          <span className={styles.secondaryText}>
            All five price types are used. Hide a package to stop selling it; it still holds its
            price type.
          </span>
        )}
      </div>

      <p className={styles.fieldHint}>
        A saved package is never deleted: hide it instead, and use “Show it again” to bring it
        back. A hidden package still holds its price type, so a second package of that type cannot
        be added.{" "}
        {mode === "create"
          ? "Leave “Discounted rate” empty for no discount; the dates are optional."
          : "Only what you change is saved."}
      </p>
    </div>
  );
}
