"use client";

import type { GigPriceType } from "@/lib/buyer/types";
import type { BudgetTierInput, JobBudgetTier } from "@/lib/buyer/buyer-jobs-api";

const TYPES: { value: GigPriceType; label: string }[] = [
  { value: "fixed", label: "Fixed price" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export interface BudgetRow {
  key: string;
  /** null = a new row. A saved row is changed in place and cannot be removed. */
  id: number | null;
  original: JobBudgetTier | null;
  priceType: GigPriceType;
  price: string;
  description: string;
}

let counter = 0;

export function blankBudget(priceType: GigPriceType = "fixed"): BudgetRow {
  counter += 1;
  return { key: `new-${counter}`, id: null, original: null, priceType, price: "", description: "" };
}

export function rowsFromSaved(saved: JobBudgetTier[] | undefined): BudgetRow[] {
  if (!saved || saved.length === 0) return [blankBudget()];
  return [...saved]
    .sort((a, b) => a.id - b.id)
    .map((tier) => ({
      key: `tier-${tier.id}`,
      id: tier.id,
      original: tier,
      priceType: tier.price_type,
      price: tier.price,
      description: tier.description ?? "",
    }));
}

/** The items to send. Create sends every filled row. Edit (reconcile) sends a
 * saved row only when something changed, with just its id and changed fields,
 * and a new row whole; a saved row that was not touched is left out. */
export function budgetItems(rows: BudgetRow[]): BudgetTierInput[] {
  const items: BudgetTierInput[] = [];
  for (const row of rows) {
    if (row.id === null) {
      if (!row.price.trim()) continue;
      items.push({
        price_type: row.priceType,
        price: row.price.trim(),
        ...(row.description.trim() ? { description: row.description.trim() } : {}),
      });
      continue;
    }
    const o = row.original;
    const item: BudgetTierInput = { id: row.id };
    if (!o || row.priceType !== o.price_type) item.price_type = row.priceType;
    if (!o || Number(row.price) !== Number(o.price)) item.price = row.price.trim();
    if (!o || row.description.trim() !== (o.description ?? "")) item.description = row.description.trim() || null;
    if (Object.keys(item).length > 1) items.push(item);
  }
  return items;
}

/** A price type used by two rows, the one thing the server refuses for budgets. */
export function duplicateType(rows: BudgetRow[]): GigPriceType | null {
  const seen = new Set<GigPriceType>();
  for (const row of rows) {
    if (row.id === null && !row.price.trim()) continue;
    if (seen.has(row.priceType)) return row.priceType;
    seen.add(row.priceType);
  }
  return null;
}

export function BudgetBuilder({
  rows,
  onChange,
  error,
}: {
  rows: BudgetRow[];
  onChange: (rows: BudgetRow[]) => void;
  error?: string;
}) {
  const used = new Set(rows.map((r) => r.priceType));
  const free = TYPES.find((t) => !used.has(t.value))?.value;
  const patch = (key: string, changes: Partial<BudgetRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  return (
    <div data-testid="budget-builder">
      {rows.map((row) => (
        <div key={row.key} className="border rounded p-2 mb-2" data-testid="budget-row">
          <div className="form-row">
            <div className="col-6 col-md-4 mb-2">
              <select
                className="form-control"
                aria-label="Price type"
                value={row.priceType}
                onChange={(e) => patch(row.key, { priceType: e.target.value as GigPriceType })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-3 mb-2">
              <input
                className="form-control"
                type="number"
                min="0"
                step="any"
                aria-label="Price"
                placeholder="Price (৳)"
                value={row.price}
                onChange={(e) => patch(row.key, { price: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-5 mb-2">
              <input
                className="form-control"
                aria-label="Budget note"
                placeholder="Note (optional)"
                value={row.description}
                onChange={(e) => patch(row.key, { description: e.target.value })}
              />
            </div>
          </div>
          {row.id === null && rows.length > 1 && (
            <button
              type="button"
              className="btn btn-link btn-sm text-danger p-0"
              onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            >
              Remove this option
            </button>
          )}
        </div>
      ))}
      {free && (
        <button type="button" className="btn btn-light btn-sm border" onClick={() => onChange([...rows, blankBudget(free)])}>
          + Add another budget option
        </button>
      )}
      {error && (
        <p className="text-danger small mt-2" role="alert" data-testid="budget-error">
          {error}
        </p>
      )}
    </div>
  );
}
