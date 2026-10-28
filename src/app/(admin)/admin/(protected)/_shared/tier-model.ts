import type { GigPriceType } from "@/lib/gig-api";

// ---------------------------------------------------------------------------
// Price tiers shared by a job's budget (`skus`) and a bid's quote
// (`price_tiers`), docs/listing-complete-guide.md §16.4. One row per price
// type, at most one per type. Saving reconciles by `id`: a row with an id
// changes only the fields sent, one without adds a tier, a tier left out
// stays — there is no way to delete a saved tier. A bid tier also has a
// `duration` (units quoted, forced to 1 for a fixed price); a job budget has
// none.
// ---------------------------------------------------------------------------

export const TIER_PRICE_TYPES: { value: GigPriceType; label: string; unit: string }[] = [
  { value: "fixed", label: "Fixed price", unit: "" },
  { value: "hourly", label: "Hourly", unit: "hour" },
  { value: "daily", label: "Daily", unit: "day" },
  { value: "weekly", label: "Weekly", unit: "week" },
  { value: "monthly", label: "Monthly", unit: "month" },
];

export interface SavedTier {
  id: number;
  price_type: GigPriceType;
  price: string;
  duration?: number;
  description: string | null;
}

export interface TierRow {
  /** Stable React key: the saved id, or a generated one for a new row. */
  key: string;
  /** null = not saved yet. */
  id: number | null;
  original: SavedTier | null;
  priceType: GigPriceType;
  price: string;
  duration: string;
  description: string;
}

export interface TierItem {
  id?: number;
  price_type?: GigPriceType;
  price?: string;
  duration?: number;
  description?: string | null;
}

let counter = 0;

export function blankTier(priceType: GigPriceType = "fixed"): TierRow {
  counter += 1;
  return {
    key: `new-${counter}`,
    id: null,
    original: null,
    priceType,
    price: "",
    duration: "1",
    description: "",
  };
}

export function tiersFromSaved(saved: SavedTier[] | undefined): TierRow[] {
  if (!saved || saved.length === 0) return [blankTier()];
  return [...saved]
    .sort((a, b) => a.id - b.id)
    .map((tier) => ({
      key: `tier-${tier.id}`,
      id: tier.id,
      original: tier,
      priceType: tier.price_type,
      price: tier.price,
      duration: String(tier.duration ?? 1),
      description: tier.description ?? "",
    }));
}

export function firstFreeType(rows: TierRow[]): GigPriceType | null {
  const used = new Set(rows.map((row) => row.priceType));
  return TIER_PRICE_TYPES.find((opt) => !used.has(opt.value))?.value ?? null;
}

export interface TierProblems {
  general: string | null;
  rows: Record<string, Partial<Record<"priceType" | "price" | "duration", string>>>;
}

export function validateTiers(
  rows: TierRow[],
  options: { withDuration: boolean; requireOne: boolean; noun: string },
): TierProblems {
  const problems: TierProblems = { general: null, rows: {} };
  const add = (key: string, field: "priceType" | "price" | "duration", message: string) => {
    problems.rows[key] = { ...problems.rows[key], [field]: message };
  };
  if (options.requireOne && rows.length === 0) {
    problems.general = `Add at least one ${options.noun}.`;
  }
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.priceType)) add(row.key, "priceType", "Another row already uses this price type.");
    seen.add(row.priceType);
    const price = row.price.trim();
    if (price === "") add(row.key, "price", "Enter the price.");
    else if (!(Number(price) >= 0)) add(row.key, "price", "The price must be 0 or more.");
    if (options.withDuration && row.priceType !== "fixed") {
      const duration = row.duration.trim();
      if (!/^\d+$/.test(duration) || Number(duration) < 1) {
        add(row.key, "duration", "Use a whole number, 1 or more.");
      }
    }
  }
  return problems;
}

export function hasTierProblems(problems: TierProblems): boolean {
  return problems.general != null || Object.keys(problems.rows).length > 0;
}

function sameNumber(a: string, b: string): boolean {
  return Number(a) === Number(b);
}

function rowDuration(row: TierRow): number {
  return row.priceType === "fixed" ? 1 : Number(row.duration);
}

function newItem(row: TierRow, withDuration: boolean): TierItem {
  const item: TierItem = { price_type: row.priceType, price: row.price.trim() };
  if (withDuration) item.duration = rowDuration(row);
  if (row.description.trim()) item.description = row.description.trim();
  return item;
}

function changedItem(row: TierRow, original: SavedTier, withDuration: boolean): TierItem {
  const patch: TierItem = {};
  if (row.priceType !== original.price_type) patch.price_type = row.priceType;
  if (!sameNumber(row.price, original.price)) patch.price = row.price.trim();
  if (withDuration && rowDuration(row) !== (original.duration ?? 1)) patch.duration = rowDuration(row);
  if (row.description.trim() !== (original.description ?? "")) {
    patch.description = row.description.trim() || null;
  }
  return patch;
}

export interface TierPayload {
  /** `undefined` on edit when nothing changed: leave the list out. */
  items: TierItem[] | undefined;
  /** Row key of each item by position, to place a server error
   * ("skus.0.price") beside the right row. */
  rowKeys: string[];
}

export function buildTierPayload(
  rows: TierRow[],
  mode: "create" | "edit",
  withDuration: boolean,
): TierPayload {
  if (mode === "create") {
    return { items: rows.map((row) => newItem(row, withDuration)), rowKeys: rows.map((row) => row.key) };
  }
  const items: TierItem[] = [];
  const rowKeys: string[] = [];
  for (const row of rows) {
    if (row.id == null) {
      items.push(newItem(row, withDuration));
      rowKeys.push(row.key);
    } else if (row.original) {
      const patch = changedItem(row, row.original, withDuration);
      if (Object.keys(patch).length > 0) {
        items.push({ id: row.id, ...patch });
        rowKeys.push(row.key);
      }
    }
  }
  return { items: items.length > 0 ? items : undefined, rowKeys };
}
