import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";
import { ENDPOINTS } from "./endpoints";

// ---------------------------------------------------------------------------
// Brand — flat reference list that listings pick from (docs/listing-module-
// guide.md §4). Admin-only; List, Create, Update-PATCH and Delete only (no
// single-item retrieve). `slug` is always server-generated from `name` and is
// unique across the whole project. Delete is refused with 409 while any
// listing (even a soft-deleted one) still uses the brand — deactivating it
// (`is_active: false`) is the intended alternative. `image` is write-only (a
// new file replaces the old one; it cannot be cleared); `image_path` and
// `image_url` are read-only and null until one is uploaded. The server refuses
// an image over 2 MB.
// ---------------------------------------------------------------------------

export interface BrandItem {
  id: number;
  name: string;
  slug: string;
  image_path: string | null;
  image_url: string | null;
  is_active: boolean;
  created_by: number | null;
  creator_name: string | null;
  creator_type: string | null;
}

export interface BrandInput {
  name: string;
  is_active: boolean;
  /** A new logo replaces the current one. Leave out to keep it. */
  image?: File | null;
}

const BRANDS = ENDPOINTS.admin.catalog.brands;

export function listBrands(params: URLSearchParams) {
  return authFetch<PaginatedResponse<BrandItem>>("admin", `${BRANDS.list}?${params}`);
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

/** Always multipart, so a logo goes in the same request as the rest of the
 * form. `is_active` is always sent, so a create never falls back to the
 * form-data default of false. */
function buildBrandFormData(input: BrandInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("is_active", String(input.is_active));
  if (input.image) formData.append("image", input.image);
  return formData;
}

export function createBrand(input: BrandInput) {
  return authFetch<BrandItem>("admin", BRANDS.list, {
    method: "POST",
    body: buildBrandFormData(input),
  });
}

export function updateBrand(id: number, input: BrandInput) {
  return authFetch<BrandItem>("admin", BRANDS.detail(id), {
    method: "PATCH",
    body: buildBrandFormData(input),
  });
}

export function deleteBrand(id: number) {
  return authFetch<void>("admin", BRANDS.detail(id), { method: "DELETE" });
}
