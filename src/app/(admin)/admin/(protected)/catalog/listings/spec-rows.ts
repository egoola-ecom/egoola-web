// ---------------------------------------------------------------------------
// `attributes` on a listing is a free-form JSON object of SPECS that a buyer
// does not pick between (e.g. {"ram": "6GB", "network": "4G"}) — not to be
// confused with Attributes (Size, Colour) that become SKU options. The form
// edits it as name / value rows.
// ---------------------------------------------------------------------------

export interface SpecRow {
  /** Stable React key. */
  key: string;
  name: string;
  value: string;
}

let counter = 0;

export function blankSpecRow(name = "", value = ""): SpecRow {
  counter += 1;
  return { key: `spec-${counter}`, name, value };
}

function isPrimitive(value: unknown): boolean {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

/** Rows for a listing's saved specs, or `null` when they are not a flat
 * name → text object (nested or a list): those are left exactly as they are
 * rather than flattened into something the seller never wrote. */
export function toSpecRows(attributes: unknown): SpecRow[] | null {
  if (attributes == null) return [];
  if (typeof attributes !== "object" || Array.isArray(attributes)) return null;
  const entries = Object.entries(attributes as Record<string, unknown>);
  if (!entries.every(([, value]) => isPrimitive(value))) return null;
  return entries.map(([name, value]) => blankSpecRow(name, value == null ? "" : String(value)));
}

/** The object to send: rows with a name, later rows winning on a repeated
 * name. */
export function specsToObject(rows: SpecRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const name = row.name.trim();
    if (name) result[name] = row.value.trim();
  }
  return result;
}

/** Same specs, whatever the key order or number-vs-text typing. */
export function sameSpecs(a: unknown, b: unknown): boolean {
  const norm = (value: unknown): string => {
    if (value == null) return "[]";
    if (typeof value !== "object" || Array.isArray(value)) return JSON.stringify(value);
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, v == null ? "" : String(v)] as const)
      .sort(([x], [y]) => x.localeCompare(y));
    return JSON.stringify(entries);
  };
  return norm(a) === norm(b);
}
