"use client";

import { useState } from "react";
import { AttributeItem } from "@/lib/attribute-api";
import { FieldErrors } from "@/lib/use-managed-list";
import {
  SkuRow,
  SkuState,
  attributeChoice,
  blankRow,
  combinationKey,
  discountStatus,
  regenerateRows,
} from "./sku-model";
import { formatAmount } from "./listing-utils";
import styles from "../../management.module.css";

const DISCOUNT_LABEL = {
  active: "Discount live now",
  scheduled: "Discount not started",
  expired: "Discount ended",
} as const;

/** Field names a row already shows beside its own input. */
const KNOWN_FIELDS = [
  "variants",
  "id",
  "sku",
  "price",
  "discounted_price",
  "discount_start_date",
  "discount_end_date",
  "stock_qty",
  "is_active",
];

/** A pill that toggles on and off — used for the attributes and values the
 * admin picks. It is a real checkbox underneath, so it works by keyboard. */
function Chip({
  label,
  checked,
  disabled,
  note,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  note?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`${styles.chip} ${checked ? styles.chipOn : ""} ${disabled ? styles.chipLocked : ""}`}
      title={disabled ? "Already used by a saved SKU" : undefined}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      {label}
      {note && <span className={styles.chipNote}>{note}</span>}
    </label>
  );
}

function SkuField({
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

/** The pricing section of the listing form: price, discount (with its dates),
 * stock and an active switch for every SKU, one card each. A listing with no
 * options has one card; a listing with options has one card per combination of
 * the picked attribute values (Size × Colour …), generated as the picks change.
 *
 * Edit mode keeps every saved SKU (they can only be hidden, never deleted),
 * locks the set of attributes the listing already uses (the backend rejects
 * SKUs with different attribute sets) and only lets new combinations be added. */
export function SkuEditor({
  mode,
  currency,
  attributes,
  state,
  onChange,
  fieldErrors,
  sentRowKeys,
  canManageAttributes = true,
}: {
  mode: "create" | "edit";
  currency: string;
  /** Active attributes with their values. */
  attributes: AttributeItem[];
  state: SkuState;
  onChange: (next: SkuState) => void;
  fieldErrors: FieldErrors;
  /** Row key for each `skus` item of the last save attempt, by position. */
  sentRowKeys: string[];
  /** False for a seller, who cannot add attributes — only ask an admin. */
  canManageAttributes?: boolean;
}) {
  const [now] = useState(() => Date.now());
  const [bulk, setBulk] = useState({ price: "", discountedPrice: "", stock: "" });
  const isEdit = mode === "edit";
  const hasSavedRows = state.rows.some((row) => row.id != null);
  const hasSavedOptions = hasSavedRows && state.hasOptions;

  // The server reports a SKU error by its position in the list that was sent;
  // sentRowKeys maps that position back to the card on screen.
  function rowError(row: SkuRow, field: string): string | undefined {
    const index = sentRowKeys.indexOf(row.key);
    if (index < 0) return undefined;
    return fieldErrors[`skus.${index}.${field}`]?.[0];
  }
  function rowErrors(row: SkuRow): string[] {
    const index = sentRowKeys.indexOf(row.key);
    if (index < 0) return [];
    const prefix = `skus.${index}.`;
    return Object.entries(fieldErrors)
      .filter(([key]) => key.startsWith(prefix) && !KNOWN_FIELDS.includes(key.slice(prefix.length)))
      .flatMap(([key, messages]) => (messages ?? []).map((m) => `${key.slice(prefix.length)}: ${m}`));
  }
  // Whole-list messages ("All SKUs of a listing must use the same attributes…").
  // The "Row N …" summaries are shown on their cards instead.
  const sectionErrors = (fieldErrors.skus ?? []).filter((message) => !/^Row \d+ /.test(message));

  function update(patch: Partial<SkuState>) {
    onChange({ ...state, ...patch });
  }
  function updateRow(key: string, patch: Partial<SkuRow>) {
    update({ rows: state.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) });
  }
  function regenerate(next: SkuState) {
    onChange({ ...next, rows: regenerateRows(next, attributes) });
  }

  function setHasOptions(hasOptions: boolean) {
    if (hasOptions === state.hasOptions) return;
    onChange({
      hasOptions,
      attributeIds: [],
      valueIds: {},
      removed: [],
      rows: hasOptions ? [] : [blankRow()],
    });
  }

  function toggleAttribute(id: number) {
    const picked = state.attributeIds.includes(id);
    regenerate({
      ...state,
      attributeIds: picked ? state.attributeIds.filter((a) => a !== id) : [...state.attributeIds, id],
      valueIds: picked ? { ...state.valueIds, [id]: [] } : state.valueIds,
      removed: [],
    });
  }

  function toggleValue(attributeId: number, valueId: number) {
    const current = state.valueIds[attributeId] ?? [];
    regenerate({
      ...state,
      valueIds: {
        ...state.valueIds,
        [attributeId]: current.includes(valueId)
          ? current.filter((v) => v !== valueId)
          : [...current, valueId],
      },
    });
  }

  function removeNewRow(row: SkuRow) {
    update({
      removed: [...state.removed, combinationKey(row.variants)],
      rows: state.rows.filter((r) => r.key !== row.key),
    });
  }

  // Fill the same price / discount / stock into many cards at once. Saved SKUs
  // are left alone on edit, so a price is never changed by accident.
  const bulkTargets = state.rows.filter((row) => !isEdit || row.id == null);
  function applyBulk() {
    const targets = new Set(bulkTargets.map((row) => row.key));
    update({
      rows: state.rows.map((row) =>
        targets.has(row.key)
          ? {
              ...row,
              ...(bulk.price.trim() ? { price: bulk.price } : {}),
              ...(bulk.discountedPrice.trim() ? { discountedPrice: bulk.discountedPrice } : {}),
              ...(bulk.stock.trim() ? { stock: bulk.stock } : {}),
            }
          : row,
      ),
    });
  }

  // Which attributes can be chosen. On edit with saved options the set is
  // locked to what the listing already uses.
  const pickableIds = hasSavedOptions
    ? state.attributeIds
    : attributes.map((attribute) => attribute.id);
  const pickedChoices = state.attributeIds
    .map((id) => attributeChoice(id, attributes, state.rows))
    .filter((choice) => choice != null);

  const activeRows = state.rows.filter((row) => row.isActive);
  const prices = activeRows
    .map((row) => Number(row.discountedPrice.trim() || row.price))
    .filter((value) => Number.isFinite(value) && value > 0);

  return (
    <div className={styles.skuSection}>
      <p className={styles.fieldHint}>
        Price, discount and stock belong to SKUs — one SKU for each thing a buyer can actually buy.
        SKUs are never deleted; switch one to inactive to take it off sale.
      </p>

      {!isEdit && (
        <div className={styles.skuModes} role="radiogroup" aria-label="How is this listing priced?">
          {[
            {
              hasOptions: false,
              title: "One price",
              text: "A single item with no sizes or colours.",
            },
            {
              hasOptions: true,
              title: "Has options",
              text: "Sizes, colours… each combination gets its own price and stock.",
            },
          ].map((choice) => (
            <label
              key={choice.title}
              className={`${styles.skuMode} ${state.hasOptions === choice.hasOptions ? styles.skuModeOn : ""}`}
            >
              <input
                type="radio"
                name="sku-mode"
                checked={state.hasOptions === choice.hasOptions}
                onChange={() => setHasOptions(choice.hasOptions)}
              />
              <span>
                <span className={styles.skuModeTitle}>{choice.title}</span>
                <span className={styles.skuModeText}>{choice.text}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {state.hasOptions && (
        <div className={styles.skuPanel}>
          <div>
            <p className={styles.skuPanelTitle}>
              {hasSavedOptions ? "Options used by this listing" : "1. Choose the options"}
            </p>
            {hasSavedOptions ? (
              <p className={styles.fieldHint}>
                Every SKU of a listing must use the same attributes, so they can&apos;t be changed
                here. Tick more values below to add new combinations.
              </p>
            ) : (
              <p className={styles.fieldHint}>
                Pick what varies — for example Size and Colour.
              </p>
            )}
          </div>

          {pickableIds.length === 0 ? (
            <p className={styles.fieldHint}>
              {canManageAttributes
                ? "No active attributes yet. Add some under Catalog → Attributes, or choose “One price”."
                : "No options (such as size or colour) are set up yet. Ask an admin to add them, or choose “One price”."}
            </p>
          ) : (
            !hasSavedOptions && (
              <div className={styles.chipRow}>
                {pickableIds.map((attributeId) => {
                  const choice = attributeChoice(attributeId, attributes, state.rows);
                  if (!choice) return null;
                  return (
                    <Chip
                      key={attributeId}
                      label={choice.name}
                      checked={state.attributeIds.includes(attributeId)}
                      onChange={() => toggleAttribute(attributeId)}
                    />
                  );
                })}
              </div>
            )
          )}

          {pickedChoices.length > 0 && (
            <p className={styles.skuPanelTitle}>
              {hasSavedOptions ? "Values" : "2. Choose the values"}
            </p>
          )}
          {pickedChoices.map((choice) => (
            <div key={choice.id} className={styles.skuAttr}>
              <span className={styles.skuAttrHead}>
                {choice.name}
                {choice.inactive && <span className={styles.secondaryText}>(inactive)</span>}
              </span>
              {choice.values.length === 0 ? (
                <span className={styles.fieldHint}>This attribute has no active values.</span>
              ) : (
                <div className={styles.chipRow}>
                  {choice.values.map((value) => (
                    <Chip
                      key={value.id}
                      label={value.name}
                      note={value.inactive ? "inactive" : undefined}
                      checked={(state.valueIds[choice.id] ?? []).includes(value.id)}
                      disabled={value.locked}
                      onChange={() => toggleValue(choice.id, value.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {state.removed.length > 0 && (
            <button
              type="button"
              className={styles.addRowButton}
              onClick={() => regenerate({ ...state, removed: [] })}
            >
              Restore {state.removed.length} removed combination{state.removed.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      {sectionErrors.map((message, i) => (
        <p key={i} className={styles.fieldError}>
          {message}
        </p>
      ))}

      {state.rows.length === 0 ? (
        <p className={styles.stateRow}>
          {state.hasOptions
            ? "Tick at least one value for every chosen attribute to generate the SKUs."
            : "No SKU yet."}
        </p>
      ) : (
        <>
          <div className={styles.skuSummary}>
            <span>
              <strong>{state.rows.length}</strong> SKU{state.rows.length === 1 ? "" : "s"}
              {state.rows.length !== activeRows.length && ` · ${activeRows.length} active`}
            </span>
            {prices.length > 0 && (
              <span className={styles.secondaryText}>
                From {formatAmount(String(Math.min(...prices)), currency)}
              </span>
            )}
          </div>

          {bulkTargets.length > 1 && (
            <div className={styles.skuBulk}>
              <span className={styles.skuPanelTitle}>
                {state.hasOptions ? "3. " : ""}Fill {isEdit ? "the new SKUs" : "every SKU"} at once
              </span>
              <div className={styles.skuBulkFields}>
                <input
                  className={styles.input}
                  aria-label="Price for all"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Price (${currency})`}
                  value={bulk.price}
                  onChange={(event) => setBulk({ ...bulk, price: event.target.value })}
                />
                <input
                  className={styles.input}
                  aria-label="Discounted price for all"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Discounted price"
                  value={bulk.discountedPrice}
                  onChange={(event) => setBulk({ ...bulk, discountedPrice: event.target.value })}
                />
                <input
                  className={styles.input}
                  aria-label="Stock for all"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock"
                  value={bulk.stock}
                  onChange={(event) => setBulk({ ...bulk, stock: event.target.value })}
                />
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={applyBulk}
                  disabled={!bulk.price.trim() && !bulk.discountedPrice.trim() && !bulk.stock.trim()}
                >
                  Apply to {bulkTargets.length}
                </button>
              </div>
              <p className={styles.fieldHint}>
                Only the boxes you fill are copied. You can still change each SKU below.
              </p>
            </div>
          )}

          <div className={styles.skuCards}>
            {state.rows.map((row, index) => {
              const original = row.original;
              const status = original ? discountStatus(original, now) : "none";
              const extra = rowErrors(row);
              const idBase = `sku-${row.key}`;
              const hasDiscount = row.discountedPrice.trim() !== "";
              return (
                <div
                  key={row.key}
                  className={`${styles.skuCard} ${row.isActive ? "" : styles.skuCardInactive}`}
                >
                  <div className={styles.skuCardHead}>
                    <div className={styles.skuCardTitle}>
                      {state.hasOptions ? (
                        <span className={styles.variantTags}>
                          {row.variants.map((v) => (
                            <span key={v.attribute} className={styles.variantTag}>
                              <span className={styles.variantTagName}>{v.attributeName}</span>
                              {v.valueName}
                            </span>
                          ))}
                        </span>
                      ) : (
                        `SKU ${index + 1}`
                      )}
                    </div>
                    {original ? (
                      <span className={`${styles.badge} ${styles.badgeGray}`}>Saved</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeGreen}`}>New</span>
                    )}
                    <label className={styles.skuActive}>
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(event) => updateRow(row.key, { isActive: event.target.checked })}
                      />
                      Active
                    </label>
                    {row.id == null && state.hasOptions && (
                      <button
                        type="button"
                        className={styles.mediaRemoveToggle}
                        style={{ marginLeft: 0 }}
                        onClick={() => removeNewRow(row)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className={styles.skuCardBody}>
                    <SkuField id={`${idBase}-price`} label={`Price (${currency})`} error={rowError(row, "price")}>
                      <input
                        id={`${idBase}-price`}
                        className={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={row.price}
                        onChange={(event) => updateRow(row.key, { price: event.target.value })}
                      />
                    </SkuField>
                    <SkuField id={`${idBase}-stock`} label="Stock" error={rowError(row, "stock_qty")}>
                      <input
                        id={`${idBase}-stock`}
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={row.stock}
                        placeholder="Not tracked"
                        onChange={(event) => updateRow(row.key, { stock: event.target.value })}
                      />
                    </SkuField>
                    <SkuField id={`${idBase}-code`} label="Product code (optional)" error={rowError(row, "sku")}>
                      <input
                        id={`${idBase}-code`}
                        className={styles.input}
                        value={row.sku}
                        placeholder="e.g. TEE-M-RED"
                        onChange={(event) => updateRow(row.key, { sku: event.target.value })}
                      />
                    </SkuField>

                    <div className={styles.skuDiscount}>
                      <SkuField
                        id={`${idBase}-discount`}
                        label="Discounted price"
                        error={rowError(row, "discounted_price")}
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
                            updateRow(
                              row.key,
                              value.trim() === ""
                                ? { discountedPrice: value, discountStart: "", discountEnd: "" }
                                : { discountedPrice: value },
                            );
                          }}
                        />
                      </SkuField>
                      <SkuField
                        id={`${idBase}-start`}
                        label="Discount starts"
                        error={rowError(row, "discount_start_date")}
                      >
                        <input
                          id={`${idBase}-start`}
                          className={styles.input}
                          type="datetime-local"
                          value={row.discountStart}
                          max={row.discountEnd || undefined}
                          disabled={!hasDiscount}
                          onChange={(event) => updateRow(row.key, { discountStart: event.target.value })}
                        />
                      </SkuField>
                      <SkuField
                        id={`${idBase}-end`}
                        label="Discount ends"
                        error={rowError(row, "discount_end_date")}
                      >
                        <input
                          id={`${idBase}-end`}
                          className={styles.input}
                          type="datetime-local"
                          value={row.discountEnd}
                          min={row.discountStart || undefined}
                          disabled={!hasDiscount}
                          onChange={(event) => updateRow(row.key, { discountEnd: event.target.value })}
                        />
                      </SkuField>
                    </div>
                  </div>

                  {(original || extra.length > 0 || rowError(row, "variants") || rowError(row, "id")) && (
                    <div className={styles.skuCardFoot}>
                      {original && (
                        <span className={styles.secondaryText}>
                          Charged now{" "}
                          <span className={styles.primaryText}>
                            {formatAmount(original.effective_price, currency)}
                          </span>
                          {status !== "none" && ` · ${DISCOUNT_LABEL[status]}`}
                          {` · ${original.reserved_qty} reserved`}
                        </span>
                      )}
                      {[rowError(row, "variants"), rowError(row, "id"), ...extra]
                        .filter((message): message is string => Boolean(message))
                        .map((message) => (
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
        </>
      )}

      <p className={styles.fieldHint}>
        Leave “Discounted price” empty for no discount. Discount dates are optional — a blank start
        or end means no limit on that side. Leave “Stock” empty when stock is not tracked (for
        example a service).
      </p>
    </div>
  );
}
