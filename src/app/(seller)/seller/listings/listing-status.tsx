import { useCallback } from "react";
import { ApiError, apiErrorDetail } from "@/lib/api";
import type { ListingStatus } from "@/lib/listing-api";
import type { SellerListingStatusLog } from "@/lib/seller-listing-api";
import { describeError } from "@/lib/use-managed-list";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { useSeller } from "../seller-context";

/** What the seller calls each status. "Pending" is "Waiting for review". */
export const SELLER_STATUS_LABELS: Record<ListingStatus, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  draft: "Draft",
};

export const SELLER_STATUS_FILTER: { value: ListingStatus; label: string }[] = [
  { value: "pending", label: SELLER_STATUS_LABELS.pending },
  { value: "approved", label: SELLER_STATUS_LABELS.approved },
  { value: "rejected", label: SELLER_STATUS_LABELS.rejected },
  { value: "changes_requested", label: SELLER_STATUS_LABELS.changes_requested },
  { value: "draft", label: SELLER_STATUS_LABELS.draft },
];

export function sellerStatusClass(status: ListingStatus): string {
  switch (status) {
    case "approved":
      return management.badgeGreen;
    case "pending":
      return management.badgeAmber;
    case "changes_requested":
      return management.badgeBlue;
    case "rejected":
      return management.badgeRed;
    default:
      return management.badgeGray;
  }
}

export function SellerStatusChip({ status }: { status: ListingStatus }) {
  return (
    <span className={`${management.badge} ${sellerStatusClass(status)}`}>
      {SELLER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Saving one of these goes back to review; the admin's reason (the `note`) is
 * what the seller needs to read first. */
export function needsFixing(status: ListingStatus): boolean {
  return status === "rejected" || status === "changes_requested" || status === "draft";
}

/** One line of the status history, in the seller's own words. `first` marks
 * the oldest entry (the creation). */
export function describeStatusLog(log: SellerListingStatusLog, first: boolean): string {
  const reason = log.note ? `: ${log.note}` : "";
  if (log.creator_type === "seller") {
    if (log.status === "pending") {
      return first ? "You created it" : `You sent it again${log.note ? ` — your message: ${log.note}` : ""}`;
    }
    return `You set it to ${SELLER_STATUS_LABELS[log.status]}${reason}`;
  }
  switch (log.status) {
    case "approved":
      return `An admin approved it${reason}`;
    case "rejected":
      return `An admin rejected it${reason}`;
    case "changes_requested":
      return `An admin asked for changes${reason}`;
    case "pending":
      return `An admin moved it back to waiting for review${reason}`;
    case "draft":
      return `An admin saved it as a draft${reason}`;
    default:
      return `An admin changed it to ${SELLER_STATUS_LABELS[log.status] ?? log.status}${reason}`;
  }
}

/**
 * The seller screens' answer to a failed call. Returns the message to show, or
 * null when the seller is being sent to the login page (a 401 that survives
 * the token refresh: suspended, deleted, session over). A 403 means the
 * account can no longer operate (an admin paused it since) — the server's own
 * message is shown (it says "not approved yet" or "inactive") and the account
 * is loaded again so the banner and the locked page match.
 */
export function useListingFailure(): (err: unknown) => string | null {
  const { handleAuthError, reload } = useSeller();
  return useCallback(
    (err: unknown) => {
      if (handleAuthError(err)) return null;
      if (err instanceof ApiError && err.status === 403) void reload();
      return apiErrorDetail(err) ?? describeError(err);
    },
    [handleAuthError, reload],
  );
}
