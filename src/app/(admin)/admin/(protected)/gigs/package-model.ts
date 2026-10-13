import { GigPriceType, GigSku, GigSkuInput } from "@/lib/gig-api";
import { fromLocalInput, toLocalInput } from "../_shared/datetime";
import { PRICE_TYPE_OPTIONS } from "./gig-utils";

// ---------------------------------------------------------------------------
// Pure logic behind the Packages section of the gig form
// (docs/listing-complete-guide.md §14.3). A package is a gig SKU: a price type
// and the RATE for it, an optional discount, a description. The form keeps one
// list of `PackageRow`; `buildPackagePayload` turns it into the `skus` list:
//   - create → every row, in full;
//   - update → only the rows that changed, each with its `id`, plus new rows
//     without an `id`. Packages are never deleted: a saved one is hidden with
//     `is_active: false`.
// At most ONE package per price type, hidden ones included (a hidden package
// still holds its price type, so it is shown again instead of adding another).
// ---------------------------------------------------------------------------

export interface PackageRow {
  /** Stable React key (the SKU id, or a generated one for unsaved rows). */
  key: string;
  /** null = not saved yet. */
  id: number | null;
  /** The saved package this row was loaded from — used to send only changes. */
  original: GigSku | null;
  priceType: GigPriceType | "";
  price: string;
  discountedPrice: string;
  discountStart: string;
  discountEnd: string;
  description: string;
  descriptionBn: string;
  sku: string;
  isActive: boolean;
}

export const ALL_PRICE_TYPES: GigPriceType[] = PRICE_TYPE_OPTIONS.map((opt) => opt.value);

let rowCounter = 0;

export function blankPackage(priceType: GigPriceType | "" = ""): PackageRow {
  rowCounter += 1;
  return {
    key: `new-${rowCounter}`,
    id: null,
    original: null,
    priceType,
    price: "",
    discountedPrice: "",
    discountStart: "",
    discountEnd: "",
    description: "",
    descriptionBn: "",
    sku: "",
    isActive: true,
  };
}

/** The discounted price as the form shows it: blank when it just repeats the
 * price (the server always returns one, equal to `price` without a discount). */
function discountField(sku: GigSku): string {
  return Number(sku.discounted_price) < Number(sku.price) ? sku.discounted_price : "";
}

function rowFromSku(sku: GigSku): PackageRow {
  return {
    key: `sku-${sku.id}`,
    id: sku.id,
    original: sku,
    priceType: sku.price_type,
    price: sku.price,
    discountedPrice: discountField(sku),
    discountStart: toLocalInput(sku.discount_start_date),
    discountEnd: toLocalInput(sku.discount_end_date),
    description: sku.description ?? "",
    descriptionBn: sku.description_bn ?? "",
    sku: sku.sku ?? "",
    isActive: sku.is_active,
  };
}

/** The rows to start from: the saved packages (oldest first), or one blank
 * row on a new gig. */
export function initialPackages(skus: GigSku[] | undefined): PackageRow[] {
  if (!skus || skus.length === 0) return [blankPackage("hourly")];
  return [...skus].sort((a, b) => a.id - b.id).map(rowFromSku);
}

/** Price types that another row already holds (hidden saved rows included). */
export function usedPriceTypes(rows: PackageRow[], exceptKey?: string): Set<GigPriceType> {
  const used = new Set<GigPriceType>();
  for (const row of rows) {
    if (row.key !== exceptKey && row.priceType) used.add(row.priceType);
  }
  return used;
}

/** The first price type nobody holds yet, or null when all five are used. */
export function firstFreePriceType(rows: PackageRow[]): GigPriceType | null {
  const used = usedPriceTypes(rows);
  return ALL_PRICE_TYPES.find((type) => !used.has(type)) ?? null;
}

function sameNumber(a: string, b: string): boolean {
  if (a.trim() === "" || b.trim() === "") return a.trim() === b.trim();
  return Number(a) === Number(b);
}

/** Errors found before sending, per row (by row key) and for the section. */
export interface PackageProblems {
  general: string | null;
  rows: Record<string, Partial<Record<"priceType" | "price" | "discountedPrice" | "dates", string>>>;
}

/** The checks the server will make, done first so the admin sees them beside
 * the right row: a price type on every row and no price type twice, a rate of
 * 0 or more, a discounted price not above the price, a date window that needs
 * a lower discounted price, and an end after the start. */
export function validatePackages(rows: PackageRow[], mode: "create" | "edit"): PackageProblems {
  const problems: PackageProblems = { general: null, rows: {} };
  const add = (key: string, field: keyof PackageProblems["rows"][string], message: string) => {
    problems.rows[key] = { ...problems.rows[key], [field]: message };
  };

  if (mode === "create" && rows.length === 0) {
    problems.general = "Add at least one package: a gig needs a price.";
  }

  const seen = new Map<GigPriceType, string>();
  for (const row of rows) {
    if (!row.priceType) {
      add(row.key, "priceType", "Choose a price type.");
    } else if (seen.has(row.priceType)) {
      add(row.key, "priceType", "Another package already uses this price type.");
    } else {
      seen.set(row.priceType, row.key);
    }

    const price = row.price.trim();
    if (price === "") {
      add(row.key, "price", "Enter the rate.");
    } else if (!(Number(price) >= 0)) {
      add(row.key, "price", "The rate must be 0 or more.");
    }

    const discounted = row.discountedPrice.trim();
    const hasWindow = row.discountStart !== "" || row.discountEnd !== "";
    if (discounted !== "") {
      if (!(Number(discounted) >= 0)) {
        add(row.key, "discountedPrice", "The discounted price must be 0 or more.");
      } else if (price !== "" && Number(discounted) > Number(price)) {
        add(row.key, "discountedPrice", "The discounted price cannot be higher than the rate.");
      }
    }
    if (hasWindow && (discounted === "" || (price !== "" && Number(discounted) >= Number(price)))) {
      add(row.key, "dates", "A discount window needs a discounted price lower than the rate.");
    } else if (
      row.discountStart !== "" &&
      row.discountEnd !== "" &&
      new Date(row.discountEnd).getTime() <= new Date(row.discountStart).getTime()
    ) {
      add(row.key, "dates", "The discount must end after it starts.");
    }
  }
  return problems;
}

export function hasProblems(problems: PackageProblems): boolean {
  return problems.general != null || Object.keys(problems.rows).length > 0;
}

/** The fields of a saved package's row that differ from what the server holds. */
function changedFields(row: PackageRow, original: GigSku): GigSkuInput {
  const patch: GigSkuInput = {};
  if (row.priceType && row.priceType !== original.price_type) patch.price_type = row.priceType;
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
  if (row.description.trim() !== (original.description ?? "")) {
    patch.description = row.description.trim() || null;
  }
  if (row.descriptionBn.trim() !== (original.description_bn ?? "")) {
    patch.description_bn = row.descriptionBn.trim() || null;
  }
  if (row.sku.trim() !== (original.sku ?? "")) patch.sku = row.sku.trim() || null;
  if (row.isActive !== original.is_active) patch.is_active = row.isActive;
  return patch;
}

/** A row that is being added: everything the server needs for a new package. */
function newPackageInput(row: PackageRow): GigSkuInput {
  const item: GigSkuInput = {
    price_type: row.priceType as GigPriceType,
    price: row.price.trim(),
    is_active: row.isActive,
  };
  if (row.sku.trim()) item.sku = row.sku.trim();
  if (row.discountedPrice.trim()) item.discounted_price = row.discountedPrice.trim();
  const start = fromLocalInput(row.discountStart);
  const end = fromLocalInput(row.discountEnd);
  if (start) item.discount_start_date = start;
  if (end) item.discount_end_date = end;
  if (row.description.trim()) item.description = row.description.trim();
  if (row.descriptionBn.trim()) item.description_bn = row.descriptionBn.trim();
  return item;
}

export interface PackagePayload {
  /** `undefined` on update when nothing changed (leave `skus` out entirely). */
  skus: GigSkuInput[] | undefined;
  /** Row key for each item of `skus`, by position — the server reports errors
   * by position ("skus.0.price"), this maps them back to the row on screen. */
  rowKeys: string[];
}

export function buildPackagePayload(rows: PackageRow[], mode: "create" | "edit"): PackagePayload {
  if (mode === "create") {
    return { skus: rows.map(newPackageInput), rowKeys: rows.map((row) => row.key) };
  }
  const skus: GigSkuInput[] = [];
  const rowKeys: string[] = [];
  for (const row of rows) {
    if (row.id == null) {
      skus.push(newPackageInput(row));
      rowKeys.push(row.key);
    } else if (row.original) {
      const patch = changedFields(row, row.original);
      if (Object.keys(patch).length > 0) {
        skus.push({ id: row.id, ...patch });
        rowKeys.push(row.key);
      }
    }
  }
  return { skus: skus.length > 0 ? skus : undefined, rowKeys };
}
