import { authFetch } from "./auth";
import { ENDPOINTS } from "./endpoints";

// ---------------------------------------------------------------------------
// The admin dashboard numbers, in one call (egoola-server docs: the dashboard
// PRD, docs/prd/admin-dashboard-prd.md). Counts and amounts are computed on the
// server and match the matching list endpoints. Every key is always present; a
// plain admin gets `totals.admins: null`. The server may cache for up to about
// a minute, so `generated_at` says how fresh the numbers are.
//   GET /dashboard/summary/
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  generated_at: string;
  needs_attention: {
    sellers_pending_review: number;
    sellers_unverified: number;
    listings_pending: number;
    listings_changes_requested: number;
    gigs_pending: number;
    gigs_changes_requested: number;
    orders_pending: number;
    orders_disputed: number;
  };
  totals: {
    buyers: number;
    sellers: number;
    listings: number;
    gigs: number;
    banners_live: number;
    /** null for a plain admin: only a super-admin may count admins. */
    admins: number | null;
  };
  orders: {
    today: number;
    this_month: number;
    by_status: Record<string, number>;
    revenue: {
      currency: string;
      /** Money strings with two decimals. */
      paid_this_month: string;
      due_outstanding: string;
    };
  };
  marketplace: {
    open_carts: number;
    jobs_open_for_bidding: number;
    bids_pending: number;
  };
}

export const getDashboardSummary = () =>
  authFetch<DashboardSummary>("admin", ENDPOINTS.admin.dashboard.summary);
