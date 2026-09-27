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

/** Fields common to every category representation — list rows, parent-chain
 * entries, and tree nodes all share this shape, each adding their own extra
 * field (`parent`, `parents`, `children`). */
export interface CategoryBrief {
  id: number;
  type: CategoryType;
  name: string;
  slug: string;
  image_path: string | null;
  image_url: string | null;
  sort_order: number;
  status: CategoryStatus;
}

export interface CategoryItem extends CategoryBrief {
  parent: number | null;
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

export interface CategoryParentChainItem extends CategoryBrief {
  /** Ancestors ordered root-first, immediate parent last. Empty for a
   * top-level category. */
  parents: CategoryBrief[];
}

/** Resolves every id's full ancestor chain in one call — batch every
 * category id visible on a page into a single request rather than one
 * request per row. Short-circuits to `[]` without a request when given no
 * ids, since the API 400s on an empty `categoryIds`. */
export function getCategoryParentChain(categoryIds: number[]) {
  if (categoryIds.length === 0) return Promise.resolve<CategoryParentChainItem[]>([]);
  const params = new URLSearchParams({ categoryIds: categoryIds.join(",") });
  return authFetch<CategoryParentChainItem[]>(
    "admin",
    `${CATEGORIES_PATH}parent-chain/?${params}`,
  );
}

export interface CategoryTreeNode extends CategoryBrief {
  children: CategoryTreeNode[];
}

/** Full category hierarchy as a nested tree — not paginated, every matching
 * category comes back in one response. Used to render the parent picker in
 * the create/edit form. `categoryName` prunes the tree to matches plus their
 * ancestor path and descendant subtree, never a flat disconnected list. */
export function getCategoryTree(filters: { type?: CategoryType; categoryName?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryName) params.set("categoryName", filters.categoryName);
  return authFetch<CategoryTreeNode[]>("admin", `${CATEGORIES_PATH}tree/?${params}`);
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
