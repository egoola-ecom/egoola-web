import { authFetch } from "@/lib/auth";
import { toQuery } from "./public-fetch";
import type { GigPriceType, PageResult } from "./types";
import { ENDPOINTS } from "../endpoints";

// Buyer jobs (egoola-server docs/buyer-api-guide.md section 5). A buyer posts a
// job with a budget, sellers bid, the buyer accepts one bid and that creates an
// order directly. Lists are page-based. There is no delete: a job is cancelled.

export type JobStatus = "draft" | "pending" | "open_for_bidding" | "in_progress" | "completed" | "cancelled";
export type BidStatus = "pending" | "accepted" | "rejected" | "cancelled" | string;

export interface JobBudgetTier {
  id: number;
  price_type: GigPriceType;
  price: string;
  effective_price: string;
  description: string | null;
  description_bn: string | null;
  is_active: boolean;
}

export interface JobLocation {
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
}

export interface JobRow {
  id: number;
  title: string;
  slug: string;
  category: { id: number; name: string };
  status: JobStatus;
  /** The cheapest active budget tier, null when none is active. */
  budget: { price: string; price_type: GigPriceType } | null;
  /** Every bid ever placed, whatever its status. */
  bid_count: number;
  delivery_days: number | null;
  urgent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job extends JobRow {
  title_bn?: string | null;
  description: string;
  description_bn?: string | null;
  package_includes?: string | null;
  package_includes_bn?: string | null;
  available_from?: string | null;
  available_to?: string | null;
  location: JobLocation;
  skus: JobBudgetTier[];
  /** The hired bid, null until one is accepted. */
  accepted_bid: BuyerBid | null;
  note: string | null;
}

export interface BidTier {
  id: number;
  price_type: GigPriceType;
  price: string;
  duration: number;
  description: string | null;
  total_price: string;
}

export interface BuyerBid {
  id: number;
  bidder: { id: number; name: string; profile_pic_url: string | null };
  status: BidStatus;
  accepted_price_tier: BidTier | null;
  description: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  note: string | null;
  price_tiers: BidTier[];
  created_at: string;
  updated_at: string;
}

export interface AcceptResult {
  bid: BuyerBid;
  order: { id: number; status: string; payable: string };
}

/** One budget row as sent. With an `id` it changes that tier, without one it adds. */
export interface BudgetTierInput {
  id?: number;
  price_type?: GigPriceType;
  price?: string;
  description?: string | null;
}

export interface JobInput {
  category?: number;
  title?: string;
  title_bn?: string;
  description?: string;
  description_bn?: string;
  urgent?: boolean;
  delivery_days?: number | null;
  package_includes?: string;
  package_includes_bn?: string;
  available_from?: string | null;
  available_to?: string | null;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  skus?: BudgetTierInput[];
  status?: JobStatus;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export function listJobs(query: { status?: string; search?: string; page?: number; page_size?: number } = {}) {
  return authFetch<PageResult<JobRow>>("buyer", `${ENDPOINTS.buyer.jobs.list}${toQuery(query)}`);
}

export function getJob(id: number) {
  return authFetch<Job>("buyer", ENDPOINTS.buyer.jobs.detail(id));
}

export function createJob(input: JobInput) {
  return authFetch<Job>("buyer", ENDPOINTS.buyer.jobs.list, { method: "POST", ...json(input) });
}

export function updateJob(id: number, input: JobInput) {
  return authFetch<Job>("buyer", ENDPOINTS.buyer.jobs.detail(id), { method: "PATCH", ...json(input) });
}

export function listBids(jobId: number, query: { status?: string; page?: number; page_size?: number } = {}) {
  return authFetch<PageResult<BuyerBid>>("buyer", `${ENDPOINTS.buyer.jobs.bids(jobId)}${toQuery(query)}`);
}

/** `tierId` is required only when the bid quoted more than one price option. */
export function acceptBid(jobId: number, bidId: number, tierId?: number) {
  return authFetch<AcceptResult>("buyer", ENDPOINTS.buyer.jobs.acceptBid(jobId, bidId), {
    method: "POST",
    ...json(tierId ? { price_tier_id: tierId } : {}),
  });
}

export interface JobProblem {
  /** Messages keyed by field name (`skus`, `category`, `status`...). */
  fields: Record<string, string>;
  /** A message that belongs to no field, or the generic line. */
  general: string | null;
}

const text = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ") || null;
  if (value && typeof value === "object") {
    return Object.values(value).map(text).filter(Boolean).join(" ") || null;
  }
  return null;
};

/** Reads a failed jobs call. The server sends a bare string, `{detail}`, or
 * `{field: message | [messages]}`; a 404 is a job that is not this buyer's. */
export function jobProblem(err: unknown): JobProblem {
  const status = (err as { status?: number })?.status;
  const body = (err as { body?: unknown })?.body;
  if (status === 404) return { fields: {}, general: "We couldn't find that job." };
  if (status === 400 || status === 403) {
    if (typeof body === "string") return { fields: {}, general: body };
    if (body && typeof body === "object") {
      const fields: Record<string, string> = {};
      let general: string | null = null;
      for (const [key, value] of Object.entries(body)) {
        const message = text(value);
        if (!message) continue;
        if (key === "detail" || key === "non_field_errors") general = message;
        else fields[key] = message;
      }
      if (general || Object.keys(fields).length) return { fields, general };
    }
  }
  return { fields: {}, general: "Something went wrong. Please try again." };
}
