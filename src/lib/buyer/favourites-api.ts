import { authFetch } from "@/lib/auth";
import { toQuery } from "./public-fetch";
import type { GigRow, PageResult, ProductRow } from "./types";

// Buyer wishlist (docs/buyer-api-guide.md section 4): one flat list per buyer,
// page-based, `type` optional (left out = both kinds mixed).

export type FavouriteType = "product" | "service";

export type Favourite =
  | { id: number; catalog_type: "product"; listing: ProductRow; created_at: string }
  | { id: number; catalog_type: "service"; listing: GigRow; created_at: string };

export function listFavourites(params: { type?: FavouriteType; page?: number; page_size?: number }) {
  return authFetch<PageResult<Favourite>>("buyer", `/buyer/favourites/${toQuery(params)}`);
}

/** Saving twice is a no-op 200, never a second row. */
export function saveFavourite(listing: number) {
  return authFetch<Favourite>("buyer", "/buyer/favourites/", {
    method: "POST",
    body: JSON.stringify({ listing }),
  });
}

/** Keyed by the listing id, always 204 (even if it was never saved). */
export function removeFavourite(listingId: number) {
  return authFetch<void>("buyer", `/buyer/favourites/${listingId}/`, { method: "DELETE" });
}
