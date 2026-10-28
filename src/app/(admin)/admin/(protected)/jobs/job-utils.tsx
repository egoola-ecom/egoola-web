import type { JobStatus } from "@/lib/admin-jobs-api";
import type { BidStatus } from "@/lib/admin-bids-api";
import type { GigPriceType } from "@/lib/gig-api";
import { formatAmount } from "../catalog/listings/listing-utils";
import { TIER_PRICE_TYPES } from "../_shared/tier-model";
import styles from "../management.module.css";

export const JOB_STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "open_for_bidding", label: "Open for bidding" },
  { value: "draft", label: "Draft (paused)" },
  { value: "pending", label: "Pending (reopening)" },
  { value: "in_progress", label: "In progress (hired)" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status;
}

export function jobStatusBadgeClass(status: JobStatus): string {
  switch (status) {
    case "open_for_bidding":
      return styles.badgeGreen;
    case "pending":
      return styles.badgeAmber;
    case "in_progress":
      return styles.badgeBlue;
    case "cancelled":
      return styles.badgeRed;
    default:
      return styles.badgeGray;
  }
}

/** Where a job may go from its current status (listing-complete-guide §16.2).
 * `open_for_bidding -> in_progress` never happens by an edit, only by
 * accepting a bid, so it is not listed. */
export const JOB_MOVES: Record<JobStatus, JobStatus[]> = {
  open_for_bidding: ["draft", "cancelled"],
  draft: ["pending", "cancelled"],
  pending: ["open_for_bidding", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Why a status button is unavailable from here, for its tooltip. */
export function moveBlockedReason(from: JobStatus, to: JobStatus): string {
  if (from === "completed" || from === "cancelled") return "A completed or cancelled job cannot change.";
  if (to === "in_progress") return "A job is hired by accepting a bid, not by a status change.";
  if (from === "draft" && to === "open_for_bidding") return "A paused job must go through Pending before it opens again.";
  return `A job cannot move from ${jobStatusLabel(from)} to ${jobStatusLabel(to)}.`;
}

/** A job can be edited freely only before it is hired. */
export function jobIsEditable(status: JobStatus): boolean {
  return status === "open_for_bidding" || status === "draft" || status === "pending";
}

export const BID_STATUS_OPTIONS: { value: BidStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

export function bidStatusLabel(status: BidStatus): string {
  return BID_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status;
}

export function bidStatusBadgeClass(status: BidStatus): string {
  switch (status) {
    case "accepted":
    case "completed":
      return styles.badgeGreen;
    case "pending":
      return styles.badgeAmber;
    case "rejected":
    case "cancelled":
      return styles.badgeRed;
    default:
      return styles.badgeGray;
  }
}

/** "৳1,500 fixed" or "৳500 / hour". */
export function tierText(price: string, type: GigPriceType): string {
  const unit = TIER_PRICE_TYPES.find((opt) => opt.value === type)?.unit;
  return unit ? `${formatAmount(price)} / ${unit}` : `${formatAmount(price)} fixed`;
}
