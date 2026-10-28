import type { PaginatedResponse } from "./accounts-api";
import { authFetch } from "./auth";
import type { GigPriceType } from "./gig-api";

// ---------------------------------------------------------------------------
// Admin panel for Jobs (a buyer's request for work), limit/offset paged like
// the gigs. egoola-server/docs/job-admin-guide.md §1,
// docs/listing-complete-guide.md §16.
//   GET / POST /catalog/jobs/        GET / PATCH /catalog/jobs/{id}/
// No delete: a job is cancelled. A job is never moderated; it is live from
// the moment it is posted. `buyer` is required on create and never changes.
// A status move goes through the same PATCH (`jobTransitions` in job-utils).
// ---------------------------------------------------------------------------

export type JobStatus =
  | "draft"
  | "pending"
  | "open_for_bidding"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface JobCategory {
  id: number;
  name: string;
  name_bn: string | null;
  slug: string;
}

export interface JobBuyer {
  id: number;
  name: string;
  phone: string;
  email: string;
}

export interface JobBudget {
  price: string;
  price_type: GigPriceType;
}

export interface JobListItem {
  id: number;
  title: string;
  title_bn: string | null;
  slug: string;
  category: JobCategory;
  buyer: JobBuyer;
  status: JobStatus;
  /** The cheapest active budget tier; null when none is active. */
  budget: JobBudget | null;
  /** Every bid ever placed, any status. */
  bid_count: number;
  delivery_days: number | null;
  urgent: boolean | null;
  created_at: string;
  updated_at: string;
}

/** One budget tier. */
export interface JobSku {
  id: number;
  price_type: GigPriceType;
  price: string;
  effective_price: string;
  description: string | null;
  description_bn: string | null;
  is_active: boolean;
}

export interface JobAcceptedBid {
  id: number;
  status: string;
  bidder?: { id: number; name: string; phone?: string };
  [key: string]: unknown;
}

export interface JobDetail extends JobListItem {
  description: string;
  description_bn: string | null;
  package_includes: string | null;
  package_includes_bn: string | null;
  available_from: string | null;
  available_to: string | null;
  location: {
    country: number | null;
    state: number | null;
    city: number | null;
    thana: number | null;
  };
  skus: JobSku[];
  /** The bid currently hired, or null. */
  accepted_bid: JobAcceptedBid | number | null;
  note: string | null;
}

/** One item of `skus` on a write: with `id` it changes only the fields sent,
 * without it adds a tier; a tier left out stays. */
export interface JobSkuInput {
  id?: number;
  price_type?: GigPriceType;
  price?: string;
  description?: string | null;
  description_bn?: string | null;
}

export interface JobInput {
  /** Create only. */
  buyer?: number;
  category: number;
  title: string;
  title_bn: string | null;
  description: string;
  description_bn: string | null;
  delivery_days: number | null;
  urgent: boolean;
  package_includes: string | null;
  package_includes_bn: string | null;
  available_from: string | null;
  available_to: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  skus: JobSkuInput[];
  status: JobStatus;
  note: string | null;
}

export type JobOrdering = "-created_at" | "created_at" | "-updated_at" | "updated_at" | "id" | "-id";

const JOBS_PATH = "/catalog/jobs/";

/** Filters: status, category, buyer, created_from / created_to,
 * requested_from / requested_to, ordering. Search: title, description, buyer
 * name or phone. */
export function listJobs(params: URLSearchParams) {
  return authFetch<PaginatedResponse<JobListItem>>("admin", `${JOBS_PATH}?${params}`);
}

export function getJob(id: number) {
  return authFetch<JobDetail>("admin", `${JOBS_PATH}${id}/`);
}

export function createJob(input: Partial<JobInput> & { buyer: number }) {
  return authFetch<JobDetail>("admin", JOBS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateJob(id: number, input: Partial<JobInput>) {
  return authFetch<JobDetail>("admin", `${JOBS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
