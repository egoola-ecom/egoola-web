import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// Category — a single self-referencing tree shared by both product and
// service listings, split by the `type` field. Admin-only, no single-item
// retrieve endpoint (List, Create, Update-PATCH, Delete only). `slug` is
// always server-generated from `name` (duplicate-checked within the same
// `type` only). `parent` is a plain, nullable FK id — never a nested object,
// on List *or* Create/Update — so parent names shown in the UI are resolved
// client-side from a same-type options lookup.
// ---------------------------------------------------------------------------

export type CategoryType = "product" | "service";
export type CategoryStatus = "active" | "inactive";

export interface CategoryItem {
  id: number;
  type: CategoryType;
  name: string;
  slug: string;
  parent: number | null;
  image_path: string | null;
  image_url: string | null;
  sort_order: number;
  status: CategoryStatus;
}

export interface CategoryInput {
  type: CategoryType;
  name: string;
  parent: number | null;
  sort_order: number;
  status: CategoryStatus;
  image?: File | null;
}

const CATEGORIES_PATH = "/catalog/categories/";

export function listCategories(params: URLSearchParams) {
  return authFetch<PaginatedResponse<CategoryItem>>("admin", `${CATEGORIES_PATH}?${params}`);
}

/** Every category of a given type, fetched in one page — used to populate
 * the Parent dropdown and to resolve parent ids to names in the table,
 * since the API never nests the parent object. */
export function listCategoryOptions(type: CategoryType) {
  const params = new URLSearchParams({ type, limit: "500" });
  return authFetch<PaginatedResponse<CategoryItem>>("admin", `${CATEGORIES_PATH}?${params}`);
}

/** Always sent as multipart/form-data (the API accepts it for every field,
 * not just the image) so a banner image can be uploaded in the same
 * request that saves the rest of the form. `parent` is sent as an empty
 * string to explicitly detach — DRF treats that the same as JSON `null`. */
function buildCategoryFormData(input: CategoryInput): FormData {
  const formData = new FormData();
  formData.append("type", input.type);
  formData.append("name", input.name);
  formData.append("parent", input.parent != null ? String(input.parent) : "");
  formData.append("sort_order", String(input.sort_order));
  formData.append("status", input.status);
  if (input.image) formData.append("image", input.image);
  return formData;
}

export function createCategory(input: CategoryInput) {
  return authFetch<CategoryItem>("admin", CATEGORIES_PATH, {
    method: "POST",
    body: buildCategoryFormData(input),
  });
}

export function updateCategory(id: number, input: CategoryInput) {
  return authFetch<CategoryItem>("admin", `${CATEGORIES_PATH}${id}/`, {
    method: "PATCH",
    body: buildCategoryFormData(input),
  });
}

export function deleteCategory(id: number) {
  return authFetch<void>("admin", `${CATEGORIES_PATH}${id}/`, { method: "DELETE" });
}
