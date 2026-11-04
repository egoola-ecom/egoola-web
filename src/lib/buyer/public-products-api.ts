import { publicGet } from "./public-fetch";
import type { ListingType, PageResult, ProductDetail, ProductRow } from "./types";
import { ENDPOINTS } from "../endpoints";

export type ProductOrdering = "newest" | "oldest" | "price_asc" | "price_desc" | "title";

export interface ProductQuery {
  category?: number;
  search?: string;
  listing_type?: ListingType;
  brand?: number;
  in_stock?: boolean | "true" | "false";
  price_min?: number | string;
  price_max?: number | string;
  seller?: number;
  country?: number;
  state?: number;
  city?: number;
  thana?: number;
  ordering?: ProductOrdering;
  page?: number;
  page_size?: number;
}

/** `GET /public/catalog/products/` (page-based). */
export function listProducts(query: ProductQuery = {}) {
  return publicGet<PageResult<ProductRow>>(ENDPOINTS.public.products.list, { ...query });
}

/** `GET /public/catalog/products/{id}/`. A gig id is a 404 here. */
export function getProduct(id: number) {
  return publicGet<ProductDetail>(ENDPOINTS.public.products.detail(id));
}
