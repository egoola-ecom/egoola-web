import type { PaginatedResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type { GigDetail, GigInput, GigListItem } from "./gig-api";
import type { ThumbnailResult } from "./listing-api";
import type { SellerListingStatusLog } from "./seller-listing-api";

// ---------------------------------------------------------------------------
// A seller's own gigs (service offers): `/seller/gigs/`
// (docs/seller-api-guide.md §6b, docs/listing-complete-guide.md §14.5). The
// same access and review rules as the seller's products:
//   - Only a seller who can operate (verified AND active); another seller's
//     gig, a product or an admin-owned gig is a 404.
//   - A new gig is always `pending`. A seller never sends seller, buyer,
//     posted_by_role, status or requested_at.
//   - Priced by PACKAGES (one per price type, no stock, no options, no
//     duration); on an edit `skus` merges by `id`, packages are only hidden.
//   - Saving is resubmitting: pending stays pending, approved stays approved,
//     rejected / changes_requested goes back to pending. No Resubmit button.
//   - No DELETE (405). The thumbnail has its own endpoint.
// ---------------------------------------------------------------------------

/** A row of "My gigs": the admin's row plus the review note and update time. */
export type SellerGigRow = Omit<GigListItem, "seller"> & {
  /** The admin's reason (rejected / changes requested), or the seller's own
   * message after a fix. */
  note: string | null;
  updated_at: string;
};

/** The full gig the seller sees: no seller / posted_by_role and no info change
 * log (that is for admins); the history only says "you" or "an admin". */
export type SellerGigDetail = Omit<
  GigDetail,
  "seller" | "posted_by_role" | "info_change_logs" | "status_change_logs"
> & {
  status_change_logs: SellerListingStatusLog[];
};

/** What a seller may send. `note` is the "message to the reviewer" and only
 * counts when saving a rejected / changes-requested gig. */
export type SellerGigInput = Omit<GigInput, "seller" | "status" | "note" | "currency"> & {
  note?: string | null;
};

const GIGS_PATH = "/seller/gigs/";

export function listSellerGigs(params: URLSearchParams) {
  return authFetch<PaginatedResponse<SellerGigRow>>("seller", `${GIGS_PATH}?${params}`);
}

export function getSellerGig(id: number) {
  return authFetch<SellerGigDetail>("seller", `${GIGS_PATH}${id}/`);
}

export function createSellerGig(input: SellerGigInput) {
  return authFetch<SellerGigDetail>("seller", GIGS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSellerGig(id: number, input: Partial<SellerGigInput>) {
  return authFetch<SellerGigDetail>("seller", `${GIGS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Adds and/or removes gallery files in one multipart PATCH (kept apart from
 * the JSON save, which carries the packages). */
export function syncSellerGigMedia(id: number, files: File[], deleteIds: number[]) {
  const formData = new FormData();
  for (const file of files) formData.append("media_file", file);
  for (const mediaId of deleteIds) formData.append("media_delete_ids", String(mediaId));
  return authFetch<SellerGigDetail>("seller", `${GIGS_PATH}${id}/`, {
    method: "PATCH",
    body: formData,
  });
}

/** Sets or replaces the thumbnail (JPG, PNG or WEBP, up to 10 MB). On a
 * rejected / changes-requested gig this also sends it back to `pending`. */
export function putSellerGigThumbnail(id: number, file: File) {
  const formData = new FormData();
  formData.append("image", file);
  return authFetch<ThumbnailResult>("seller", `${GIGS_PATH}${id}/thumbnail/`, {
    method: "PUT",
    body: formData,
  });
}

export function deleteSellerGigThumbnail(id: number) {
  return authFetch<void>("seller", `${GIGS_PATH}${id}/thumbnail/`, { method: "DELETE" });
}
