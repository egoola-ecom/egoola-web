import type { CursorResponse } from "./accounts-api";
import type { AdminBuyerSummary, AuditColumns, CartType } from "./admin-carts-api";
import { authFetch } from "./auth";

// ---------------------------------------------------------------------------
// Admin oversight of every buyer's wishlist. Read only, cursor paged.
// egoola-server/docs/cart-wishlist-admin-guide.md §2
//   GET /engagement/favourites/        GET /engagement/favourites/{id}/
// Nothing is hidden: a favourite whose listing went private is still here,
// `listing_visible` says so and the raw statuses say why.
// ---------------------------------------------------------------------------

const FAVOURITES_PATH = "/engagement/favourites/";

export interface FavouriteListing {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  catalog_type: CartType;
  /** The listing's own status (approved, pending, rejected...). */
  status: string;
  image_url: string | null;
  seller: {
    id: number;
    name: string;
    status: string;
    verification_status: string;
  };
}

export interface FavouriteListItem {
  id: number;
  buyer: AdminBuyerSummary;
  listing: FavouriteListing;
  /** Whether the listing passes the buyer-facing visibility rule right now. */
  listing_visible: boolean;
  created_at: string;
}

export type FavouriteDetail = FavouriteListItem & AuditColumns;

export function listFavourites(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${FAVOURITES_PATH}?${target}`;
  return authFetch<CursorResponse<FavouriteListItem>>("admin", path);
}

export function getFavourite(id: number) {
  return authFetch<FavouriteDetail>("admin", `${FAVOURITES_PATH}${id}/`);
}
