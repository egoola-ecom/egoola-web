import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// Attributes and attribute values — the "kinds of option" (Size, Colour…) and
// their choices (S, M, L…) that listing SKUs are built from
// (docs/attribute-sku-guide.md §2–3). Admin-only.
//   - Attribute `name` is unique (letter case ignored); values are unique
//     inside their attribute and can never move to another attribute.
//   - The nested `values` on an attribute are the short form; the values
//     endpoint returns the full record.
//   - Delete is refused with 409 while a SKU uses the record — deactivating it
//     (`is_active: false`) is the intended alternative.
// ---------------------------------------------------------------------------

/** A value as nested inside an attribute response. */
export interface AttributeValueBrief {
  id: number;
  name: string;
  name_bn: string | null;
  is_active: boolean;
}

export interface AttributeValueItem extends AttributeValueBrief {
  attribute: number;
  attribute_name: string;
  description: string | null;
  description_bn: string | null;
  created_by: number | null;
  creator_name: string | null;
  creator_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttributeItem {
  id: number;
  name: string;
  name_bn: string | null;
  description: string | null;
  description_bn: string | null;
  is_active: boolean;
  values: AttributeValueBrief[];
  created_by: number | null;
  creator_name: string | null;
  creator_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttributeInput {
  name: string;
  name_bn?: string | null;
  description?: string | null;
  description_bn?: string | null;
  is_active?: boolean;
}

export interface AttributeValueInput {
  /** Required on create; cannot be changed afterwards (re-sending the same id is fine). */
  attribute?: number;
  name: string;
  name_bn?: string | null;
  description?: string | null;
  description_bn?: string | null;
  is_active?: boolean;
}

const ATTRIBUTES_PATH = "/catalog/attributes/";
const VALUES_PATH = "/catalog/attribute-values/";

export function listAttributes(params: URLSearchParams) {
  return authFetch<PaginatedResponse<AttributeItem>>("admin", `${ATTRIBUTES_PATH}?${params}`);
}

/** Every attribute (optionally only active ones) with its values, following
 * `next` pages — for the SKU option pickers on the listing form. */
export async function listAllAttributes(activeOnly = false): Promise<AttributeItem[]> {
  const all: AttributeItem[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (activeOnly) params.set("is_active", "true");
    const page = await listAttributes(params);
    all.push(...page.results);
    if (!page.next) break;
  }
  return all;
}

export function getAttribute(id: number) {
  return authFetch<AttributeItem>("admin", `${ATTRIBUTES_PATH}${id}/`);
}

export function createAttribute(input: AttributeInput) {
  return authFetch<AttributeItem>("admin", ATTRIBUTES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAttribute(id: number, input: Partial<AttributeInput>) {
  return authFetch<AttributeItem>("admin", `${ATTRIBUTES_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAttribute(id: number) {
  return authFetch<void>("admin", `${ATTRIBUTES_PATH}${id}/`, { method: "DELETE" });
}

export function listAttributeValues(params: URLSearchParams) {
  return authFetch<PaginatedResponse<AttributeValueItem>>("admin", `${VALUES_PATH}?${params}`);
}

export function createAttributeValue(input: AttributeValueInput & { attribute: number }) {
  return authFetch<AttributeValueItem>("admin", VALUES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAttributeValue(id: number, input: Partial<AttributeValueInput>) {
  return authFetch<AttributeValueItem>("admin", `${VALUES_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAttributeValue(id: number) {
  return authFetch<void>("admin", `${VALUES_PATH}${id}/`, { method: "DELETE" });
}
