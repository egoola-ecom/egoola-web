import type { CursorResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type { BidInput, BidStatus, BidTier } from "./admin-bids-api";
import type { JobBudget, JobCategory, JobStatus } from "./admin-jobs-api";
import { ENDPOINTS } from "./endpoints";

// ---------------------------------------------------------------------------
// The seller's job board and bids (docs/seller-api-guide.md §6c,
// docs/listing-complete-guide.md §16.8-16.9). Needs a seller who can operate
// (verified AND active), otherwise 403. Every list is CURSOR paged
// ({next, previous, results}, no `count`).
//   GET  /seller/jobs/              the board: open jobs only
//   GET  /seller/jobs/{id}/         an open job, or one I bid on (404 else)
//   GET  /seller/jobs/mine/         jobs I bid on; ?won=true = the ones I got
//   POST /seller/jobs/{id}/bids/    place a bid
//   GET  /seller/bids/ , GET / PATCH /seller/bids/{id}/
// A bid is never deleted. Editing works only while `pending`, and the only
// status move a seller can make is `cancelled`.
// ---------------------------------------------------------------------------

export interface SellerJobCard {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  category: JobCategory;
  status: JobStatus;
  /** The cheapest active budget tier; null when none is active. */
  budget: JobBudget | null;
  delivery_days: number | null;
  urgent: boolean | null;
  /** Every bid on the job, from any seller. */
  bid_count: number;
  /** This seller's own bids on it, any status. */
  my_bid_count: number;
  created_at: string;
}

/** A bid as the seller sees it, with a short summary of its job. */
export interface SellerBid {
  id: number;
  job: { id: number; title: string; title_bn: string | null; slug: string; status: JobStatus };
  status: BidStatus;
  description: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  price_tiers: BidTier[];
  /** The hired tier: an object, or (older servers) its id. */
  accepted_price_tier: BidTier | number | null;
  created_at: string;
  updated_at: string;
}

export interface SellerBidDetail extends SellerBid {
  actual_start_date: string | null;
  actual_end_date: string | null;
  note: string | null;
}

export interface SellerJobPlace {
  id: number;
  name: string;
}

export interface SellerJobDetail extends SellerJobCard {
  description: string;
  description_bn: string | null;
  package_includes: string | null;
  package_includes_bn: string | null;
  available_from: string | null;
  available_to: string | null;
  location: {
    country: SellerJobPlace | null;
    state: SellerJobPlace | null;
    city: SellerJobPlace | null;
    thana: SellerJobPlace | null;
  };
  /** This seller's own bids on the job, any status. */
  my_bids: SellerBid[];
}

/** What a seller sends: the admin's bid input without the job and the seller
 * (the job is in the URL, the seller is the token). */
export type SellerBidInput = Omit<BidInput, "listing" | "bidder">;


/** Pass the filters for the first page, or the server's `next` link to go on. */
export function listBoardJobs(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${ENDPOINTS.seller.jobs.list}?${target}`;
  return authFetch<CursorResponse<SellerJobCard>>("seller", path);
}

/** Pass `won=true` among the filters for only the jobs I got. */
export function listMyJobs(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${ENDPOINTS.seller.jobs.mine}?${target}`;
  return authFetch<CursorResponse<SellerJobCard>>("seller", path);
}

export function getSellerJob(id: number) {
  return authFetch<SellerJobDetail>("seller", ENDPOINTS.seller.jobs.detail(id));
}

export function listMyBids(target: URLSearchParams | string) {
  const path = typeof target === "string" ? target : `${ENDPOINTS.seller.bids.list}?${target}`;
  return authFetch<CursorResponse<SellerBid>>("seller", path);
}

export function getMyBid(id: number) {
  return authFetch<SellerBidDetail>("seller", ENDPOINTS.seller.bids.detail(id));
}

export function placeBid(jobId: number, input: Partial<SellerBidInput>) {
  return authFetch<SellerBidDetail>("seller", ENDPOINTS.seller.jobs.bids(jobId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMyBid(id: number, input: Partial<SellerBidInput>) {
  return authFetch<SellerBidDetail>("seller", ENDPOINTS.seller.bids.detail(id), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cancelMyBid(id: number) {
  return updateMyBid(id, { status: "cancelled" });
}

/** The tier the buyer hired, whether the server sends the tier or its id. */
export function hiredTierId(bid: Pick<SellerBid, "accepted_price_tier">): number | null {
  const tier = bid.accepted_price_tier;
  if (tier == null) return null;
  return typeof tier === "number" ? tier : tier.id;
}

/** A bid still counts (blocks a second one) while it is pending or accepted. */
export function bidIsLive(bid: Pick<SellerBid, "status">): boolean {
  return bid.status === "pending" || bid.status === "accepted";
}
