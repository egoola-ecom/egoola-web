import type { PageResult } from "./types";

export interface PageQuery {
  page?: number;
  page_size?: number;
}

/** Same contract as the API's page-based paging: a page past the last one is an
 * error, no match is `count: 0`. */
export function paginate<T>(items: T[], { page = 1, page_size = 20 }: PageQuery): PageResult<T> {
  const size = Math.min(Math.max(page_size, 1), 100);
  const total_pages = items.length === 0 ? 0 : Math.ceil(items.length / size);
  if (page < 1 || (total_pages > 0 && page > total_pages) || (total_pages === 0 && page > 1)) {
    throw new Error("Invalid page.");
  }
  const start = (page - 1) * size;
  return { count: items.length, page, page_size: size, total_pages, results: items.slice(start, start + size) };
}
