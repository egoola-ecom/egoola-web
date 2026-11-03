import { publicGet } from "./public-fetch";
import type { GigDetail, GigPriceType, GigRow, PageResult } from "./types";

export type GigOrdering = "newest" | "oldest" | "price_asc" | "price_desc" | "title";

export interface GigQuery {
  category?: number;
  search?: string;
  seller?: number;
  price_type?: GigPriceType;
  price_min?: number | string;
  price_max?: number | string;
  delivery_days_max?: number | string;
  urgent?: boolean | "true" | "false";
  country?: number;
  state?: number;
  city?: number;
  thana?: number;
  ordering?: GigOrdering;
  page?: number;
  page_size?: number;
}

/** `GET /public/catalog/gigs/` (page-based). */
export function listGigs(query: GigQuery = {}) {
  return publicGet<PageResult<GigRow>>("/catalog/gigs/", { ...query });
}

/** `GET /public/catalog/gigs/{id}/`. A product id is a 404 here. */
export function getGig(id: number) {
  return publicGet<GigDetail>(`/catalog/gigs/${id}/`);
}
