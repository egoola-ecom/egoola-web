import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// Brand — flat reference list that listings pick from (docs/listing-module-
// guide.md §4). Admin-only; List, Create, Update-PATCH and Delete only (no
// single-item retrieve). `slug` is always server-generated from `name` and is
// unique across the whole project. Delete is refused with 409 while any
// listing (even a soft-deleted one) still uses the brand — deactivating it
// (`is_active: false`) is the intended alternative.
// ---------------------------------------------------------------------------

export interface BrandItem {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_by: number | null;
  creator_name: string | null;
  creator_type: string | null;
}

export interface BrandInput {
  name: string;
  is_active: boolean;
}

const BRANDS_PATH = "/catalog/brands/";

export function listBrands(params: URLSearchParams) {
  return authFetch<PaginatedResponse<BrandItem>>("admin", `${BRANDS_PATH}?${params}`);
}

/** Every brand (optionally only active ones), following `next` pages — for
 * dropdowns and for resolving brand ids to names on the listing screens,
 * where a single 20-row page would silently drop brands. */
export async function listAllBrands(activeOnly = false): Promise<BrandItem[]> {
  const all: BrandItem[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (activeOnly) params.set("is_active", "true");
    const page = await listBrands(params);
    all.push(...page.results);
    if (!page.next) break;
  }
  return all;
}

export function createBrand(input: BrandInput) {
  return authFetch<BrandItem>("admin", BRANDS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBrand(id: number, input: BrandInput) {
  return authFetch<BrandItem>("admin", `${BRANDS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteBrand(id: number) {
  return authFetch<void>("admin", `${BRANDS_PATH}${id}/`, { method: "DELETE" });
}
