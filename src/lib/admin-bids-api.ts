import type { CursorResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type { GigPriceType } from "./gig-api";
import type { JobStatus } from "./admin-jobs-api";

// ---------------------------------------------------------------------------
// Admin panel for Bidding, cursor paged ({next, previous, results}, no
// `count`). egoola-server/docs/job-admin-guide.md §2.
//   GET / POST /bidding/bids/          GET / PATCH /bidding/bids/{id}/
//   POST /bidding/bids/{id}/accept/    POST /bidding/bids/{id}/reject/
// An admin may create or edit a bid for a seller, hire on the buyer's behalf
// (`accept`) and undo a hire (`reject`, mandatory note). A bid is never
// deleted. Edit works only while `pending`, and the only status move is
// `cancelled`.
// ---------------------------------------------------------------------------

export type BidStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";

export interface BidTier {
  id: number;
  price_type: GigPriceType;
  price: string;
  /** Units the quote covers; always 1 for a fixed price. */
  duration: number;
  description: string | null;
  /** price x duration, set by the server. */
  total_price: string;
}

export interface BidJobBrief {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  status: JobStatus;
  /** The buyer's id. */
  buyer: number;
}

export interface BidderBrief {
  id: number;
  name: string;
  phone: string;
}

export interface BidListItem {
  id: number;
  job: BidJobBrief;
  bidder: BidderBrief;
  status: BidStatus;
  description: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  price_tiers: BidTier[];
  /** The hired tier: the server answers its id on some calls and the tier
   * itself on others, so both are read (`acceptedTierId`). */
  accepted_price_tier: BidTier | number | null;
  created_at: string;
  updated_at: string;
}

export interface BidDetail extends BidListItem {
  actual_start_date: string | null;
  actual_end_date: string | null;
  note: string | null;
}

export function acceptedTierId(bid: Pick<BidListItem, "accepted_price_tier">): number | null {
  const tier = bid.accepted_price_tier;
  if (tier == null) return null;
  return typeof tier === "number" ? tier : tier.id;
}

export interface BidTierInput {
  id?: number;
  price_type?: GigPriceType;
  price?: string;
  duration?: number;
  description?: string | null;
}

export interface BidInput {
  /** Create only: the job id and the seller id. */
  listing?: number;
  bidder?: number;
  description: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  price_tiers: BidTierInput[];
  /** Edit only; `cancelled` is the one move. */
  status: "cancelled";
}

export interface AcceptedOrder {
  id: number;
  status: string;
  payable: string;
}

export type BidOrdering = "-created_at" | "created_at" | "-updated_at" | "updated_at";

const BIDS_PATH = "/bidding/bids/";

/** Pass the filters (status, listing = job id, bidder = seller id, ordering)
 * for the first page, or the server's `next` link to continue. */
export function listBids(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${BIDS_PATH}?${target}`;
  return authFetch<CursorResponse<BidListItem>>("admin", path);
}

export function getBid(id: number) {
  return authFetch<BidDetail>("admin", `${BIDS_PATH}${id}/`);
}

export function createBid(input: Partial<BidInput> & { listing: number; bidder: number }) {
  return authFetch<BidDetail>("admin", BIDS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBid(id: number, input: Partial<BidInput>) {
  return authFetch<BidDetail>("admin", `${BIDS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** `priceTierId` only when the bid quotes more than one tier. */
export function acceptBid(id: number, priceTierId?: number) {
  return authFetch<{ bid: BidDetail; order: AcceptedOrder }>("admin", `${BIDS_PATH}${id}/accept/`, {
    method: "POST",
    body: JSON.stringify(priceTierId != null ? { price_tier_id: priceTierId } : {}),
  });
}

/** Undo a hire: the bid is `rejected`, its order cancelled and the job opens
 * again. The note is mandatory. */
export function rejectBid(id: number, note: string) {
  return authFetch<BidDetail>("admin", `${BIDS_PATH}${id}/reject/`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
