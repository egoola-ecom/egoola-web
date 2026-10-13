import { AttributeItem } from "@/lib/attribute-api";
import { ListingCore, ListingSku, ListingSkuInput } from "@/lib/listing-api";
import { fromLocalInput, toLocalInput } from "../../_shared/datetime";

// ---------------------------------------------------------------------------
// Pure logic behind the SKU section of the listing form
// (docs/attribute-sku-guide.md §4). The form keeps one `SkuState`; the editor
// component renders and edits it; `buildSkuPayload` turns it into the `skus`
// list to send:
//   - create → every row, in full;
//   - update → only rows that changed, each with its `id`, plus new rows
//     without an `id`. SKUs are never deleted (hide with `is_active: false`).
// ---------------------------------------------------------------------------

export interface SkuRowVariant {
  attribute: number;
  attributeName: string;
  value: number;
  valueName: string;
}

export interface SkuRow {
  /** Stable React key (the SKU id, or a generated one for unsaved rows). */
  key: string;
  /** null = not saved yet. */
  id: number | null;
  /** The saved SKU this row was loaded from — used to send only changes. */
  original: ListingSku | null;
  sku: string;
  price: string;
  discountedPrice: string;
  discountStart: string;
  discountEnd: string;
  stock: string;
  isActive: boolean;
  variants: SkuRowVariant[];
}

export interface SkuState {
  hasOptions: boolean;
  /** Attribute ids in the order picked. */
  attributeIds: number[];
  /** Picked value ids per attribute id. */
  valueIds: Record<number, number[]>;
  /** Combination keys the admin removed from the generated list. */
  removed: string[];
  rows: SkuRow[];
}

let rowCounter = 0;

export function blankRow(variants: SkuRowVariant[] = []): SkuRow {
  rowCounter += 1;
  return {
    key: `new-${rowCounter}`,
    id: null,
    original: null,
    sku: "",
    price: "",
    discountedPrice: "",
    discountStart: "",
    discountEnd: "",
    stock: "",
    isActive: true,
    variants,
  };
}

/** Stable key of a combination of options, independent of order. */
export function combinationKey(variants: { attribute: number; value: number }[]): string {
  return variants
    .map((v) => `${v.attribute}:${v.value}`)
    .sort()
    .join("|");
}

/** The discounted price as the form shows it: blank when it just repeats the
 * price (the server always returns one, equal to `price` without a discount). */
function discountField(sku: ListingSku): string {
  return Number(sku.discounted_price) < Number(sku.price) ? sku.discounted_price : "";
}

function rowFromSku(sku: ListingSku): SkuRow {
  return {
    key: `sku-${sku.id}`,
    id: sku.id,
    original: sku,
    sku: sku.sku ?? "",
    price: sku.price,
    discountedPrice: discountField(sku),
    discountStart: toLocalInput(sku.discount_start_date),
    discountEnd: toLocalInput(sku.discount_end_date),
    stock: sku.stock_qty != null ? String(sku.stock_qty) : "",
    isActive: sku.is_active,
    variants: sku.variants.map((v) => ({
      attribute: v.attribute,
      attributeName: v.attribute_name,
      value: v.attribute_value,
      valueName: v.attribute_value_name,
    })),
  };
}

export function initialSkuState(initial?: ListingCore | null): SkuState {
  const skus = initial?.skus ?? [];
  if (skus.length === 0) {
    return { hasOptions: false, attributeIds: [], valueIds: {}, removed: [], rows: [blankRow()] };
  }
  const rows = [...skus].sort((a, b) => a.id - b.id).map(rowFromSku);
  const withVariants = rows.find((row) => row.variants.length > 0);
  const attributeIds = withVariants ? withVariants.variants.map((v) => v.attribute) : [];
  const valueIds: Record<number, number[]> = {};
  for (const row of rows) {
    for (const variant of row.variants) {
      const list = (valueIds[variant.attribute] ??= []);
      if (!list.includes(variant.value)) list.push(variant.value);
    }
  }
  return { hasOptions: Boolean(withVariants), attributeIds, valueIds, removed: [], rows };
}

/** What the picker offers for one attribute: its active values, plus any value
 * an existing SKU already uses (those stay ticked and locked, since SKUs are
 * never deleted). Falls back to the names carried by the SKUs themselves when
 * the attribute is no longer in the active list. */
export interface AttributeChoice {
  id: number;
  name: string;
  inactive: boolean;
  values: { id: number; name: string; inactive: boolean; locked: boolean }[];
}

export function attributeChoice(
  attributeId: number,
  attributes: AttributeItem[],
  rows: SkuRow[],
): AttributeChoice | null {
  const known = attributes.find((a) => a.id === attributeId);
  const usedValues = new Map<number, string>();
  let usedName: string | null = null;
  for (const row of rows) {
    if (row.id == null) continue;
    for (const variant of row.variants) {
      if (variant.attribute !== attributeId) continue;
      usedName = variant.attributeName;
      usedValues.set(variant.value, variant.valueName);
    }
  }
  if (!known && usedName == null) return null;

  const values: AttributeChoice["values"] = [];
  for (const value of known?.values ?? []) {
    if (value.is_active || usedValues.has(value.id)) {
      values.push({
        id: value.id,
        name: value.name,
        inactive: !value.is_active,
        locked: usedValues.has(value.id),
      });
    }
  }
  for (const [id, name] of usedValues) {
    if (!values.some((v) => v.id === id)) values.push({ id, name, inactive: true, locked: true });
  }
  return {
    id: attributeId,
    name: known?.name ?? usedName ?? `#${attributeId}`,
    inactive: known ? !known.is_active : true,
    values,
  };
}

/** Rebuilds the row list after the attribute / value picks change. Existing
 * (saved) rows always stay; one new row is made per combination of the picked
 * values that has no row yet, and rows already typed into keep their data. */
export function regenerateRows(state: SkuState, attributes: AttributeItem[]): SkuRow[] {
  const saved = state.rows.filter((row) => row.id != null);
  const byCombination = new Map(
    state.rows.filter((row) => row.id == null).map((row) => [combinationKey(row.variants), row]),
  );

  const choices = state.attributeIds
    .map((id) => attributeChoice(id, attributes, state.rows))
    .filter((choice): choice is AttributeChoice => choice != null);

  // Cartesian product of the picked values of every picked attribute.
  let combos: SkuRowVariant[][] = [[]];
  for (const choice of choices) {
    const picked = choice.values.filter((v) => (state.valueIds[choice.id] ?? []).includes(v.id));
    if (picked.length === 0) {
      combos = [];
      break;
    }
    combos = combos.flatMap((combo) =>
      picked.map((value) => [
        ...combo,
        { attribute: choice.id, attributeName: choice.name, value: value.id, valueName: value.name },
      ]),
    );
  }
  if (choices.length === 0) combos = [];

  const savedKeys = new Set(saved.map((row) => combinationKey(row.variants)));
  const fresh: SkuRow[] = [];
  for (const combo of combos) {
    const key = combinationKey(combo);
    if (savedKeys.has(key) || state.removed.includes(key)) continue;
    fresh.push(byCombination.get(key) ?? blankRow(combo));
  }
  return [...saved, ...fresh];
}

function sameNumber(a: string, b: string): boolean {
  if (a.trim() === "" || b.trim() === "") return a.trim() === b.trim();
  return Number(a) === Number(b);
}

/** The fields of a saved SKU's row that differ from what the server holds. */
function changedFields(row: SkuRow, original: ListingSku): ListingSkuInput {
  const patch: ListingSkuInput = {};
  if (row.sku.trim() !== (original.sku ?? "")) patch.sku = row.sku.trim();
  if (!sameNumber(row.price, original.price)) patch.price = row.price.trim();
  if (!sameNumber(row.discountedPrice, discountField(original))) {
    patch.discounted_price = row.discountedPrice.trim() || null;
  }
  if (row.discountStart !== toLocalInput(original.discount_start_date)) {
    patch.discount_start_date = fromLocalInput(row.discountStart);
  }
  if (row.discountEnd !== toLocalInput(original.discount_end_date)) {
    patch.discount_end_date = fromLocalInput(row.discountEnd);
  }
  const originalStock = original.stock_qty != null ? String(original.stock_qty) : "";
  if (row.stock.trim() !== originalStock) {
    patch.stock_qty = row.stock.trim() === "" ? null : Number(row.stock);
  }
  if (row.isActive !== original.is_active) patch.is_active = row.isActive;
  return patch;
}

/** A row that is being added: everything the server needs for a new SKU. */
function newSkuInput(row: SkuRow, withVariants: boolean): ListingSkuInput {
  const item: ListingSkuInput = { price: row.price.trim(), is_active: row.isActive };
  if (row.sku.trim()) item.sku = row.sku.trim();
  if (row.discountedPrice.trim()) item.discounted_price = row.discountedPrice.trim();
  const start = fromLocalInput(row.discountStart);
  const end = fromLocalInput(row.discountEnd);
  if (start) item.discount_start_date = start;
  if (end) item.discount_end_date = end;
  if (row.stock.trim() !== "") item.stock_qty = Number(row.stock);
  if (withVariants) {
    item.variants = row.variants.map((v) => ({ attribute: v.attribute, attribute_value: v.value }));
  }
  return item;
}

export interface SkuPayload {
  /** `undefined` on update when nothing changed (leave `skus` out entirely). */
  skus: ListingSkuInput[] | undefined;
  /** Row key for each item of `skus`, by position — the server reports errors
   * by position ("skus.0.price"), this maps them back to the row on screen. */
  rowKeys: string[];
  error: string | null;
}

export function buildSkuPayload(state: SkuState, mode: "create" | "edit"): SkuPayload {
  if (mode === "create") {
    if (state.hasOptions && state.attributeIds.length === 0) {
      return {
        skus: [],
        rowKeys: [],
        error: "Pick at least one attribute for the options, or choose “One price, no options”.",
      };
    }
    if (state.rows.length === 0) {
      return {
        skus: [],
        rowKeys: [],
        error: state.hasOptions
          ? "Pick at least one value for every chosen attribute so there is a combination to sell."
          : "Add a price for this listing.",
      };
    }
    return {
      skus: state.rows.map((row) => newSkuInput(row, state.hasOptions)),
      rowKeys: state.rows.map((row) => row.key),
      error: null,
    };
  }

  const skus: ListingSkuInput[] = [];
  const rowKeys: string[] = [];
  for (const row of state.rows) {
    if (row.id == null) {
      skus.push(newSkuInput(row, true));
      rowKeys.push(row.key);
    } else if (row.original) {
      const patch = changedFields(row, row.original);
      if (Object.keys(patch).length > 0) {
        skus.push({ id: row.id, ...patch });
        rowKeys.push(row.key);
      }
    }
  }
  return { skus: skus.length > 0 ? skus : undefined, rowKeys, error: null };
}

export type DiscountStatus = "none" | "active" | "scheduled" | "expired";

/** Where a saved SKU's discount stands at `now`. The server's own
 * `is_discount_active` decides "active"; the dates only explain "not yet" or
 * "over". */
export function discountStatus(sku: ListingSku, now: number): DiscountStatus {
  if (!(Number(sku.discounted_price) < Number(sku.price))) return "none";
  if (sku.is_discount_active) return "active";
  if (sku.discount_start_date && new Date(sku.discount_start_date).getTime() > now) return "scheduled";
  if (sku.discount_end_date && new Date(sku.discount_end_date).getTime() < now) return "expired";
  return "scheduled";
}

export function variantLabel(variants: { attributeName: string; valueName: string }[]): string {
  return variants.length === 0
    ? "Default"
    : variants.map((v) => `${v.attributeName}: ${v.valueName}`).join(" · ");
}
