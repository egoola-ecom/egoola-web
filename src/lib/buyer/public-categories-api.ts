import { publicGet } from "./public-fetch";
import type { CategoryType, PageResult, PublicCategory } from "./types";

export interface CategoryQuery {
  /** Direct children of this category; none = the top level. */
  parent_id?: number;
  /** Inside a parent: only its direct children. Without one: every level. */
  search?: string;
  type?: CategoryType;
  page?: number;
  page_size?: number;
}

/** `GET /public/catalog/categories/` (page-based). */
export function listCategories(query: CategoryQuery = {}) {
  return publicGet<PageResult<PublicCategory>>("/catalog/categories/", { ...query });
}

/** Names of a category's ancestors and of itself, root first. There is no
 * "get one category" call, so each level's name is found in the list of its
 * parent's children. `ids` is the chain, root first, ending in the category. */
export async function resolveCategoryChain(ids: number[]): Promise<PublicCategory[]> {
  const chain: PublicCategory[] = [];
  let parent: number | undefined;
  for (const id of ids) {
    const level = await listCategories({ parent_id: parent, page_size: 100 });
    const found = level.results.find((c) => c.id === id);
    if (!found) break;
    chain.push(found);
    parent = id;
  }
  return chain;
}
