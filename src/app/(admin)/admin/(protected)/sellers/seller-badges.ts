import { SellerStatus, SellerVerificationStatus } from "@/lib/accounts-api";
import styles from "../management.module.css";

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** active = green, inactive (waiting / closed) = amber, suspended = red. */
export function statusBadgeClass(status: SellerStatus): string {
  switch (status) {
    case "active":
      return styles.badgeGreen;
    case "inactive":
      return styles.badgeAmber;
    default:
      return styles.badgeRed;
  }
}

/** Words for the account switch, the same as the status values themselves:
 * Active, Inactive, Suspended. `inactive` is NOT "not approved": a verified
 * seller can be inactive, and a new sign-up is inactive until an admin
 * activates it. */
export const STATUS_LABELS: Record<SellerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

export const STATUS_SHORT_LABELS = STATUS_LABELS;

/** Words for the verification decision, the same as its values. */
export const VERIFICATION_LABELS: Record<SellerVerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

// ---------------------------------------------------------------------------
// The backend's transition rules (docs/admin/seller-verification-guide.md,
// "Transition and status rules"). The server checks them all; the screen uses
// them to switch off a choice it knows will be refused, and says why.
//   1. A Rejected seller can only move to Pending.
//   2. A seller who has ever been Verified can never be Rejected.
//   3. The account status follows the verification status:
//        Pending -> Inactive (forced)    Rejected -> Suspended (forced)
//        Unverified -> Inactive or Suspended only    Verified -> any
// ---------------------------------------------------------------------------

/** The server's own `was_ever_verified` flag. An older server that does not
 * send it is covered by the history: any past Verified entry means the same. */
export function wasEverVerified(seller: {
  was_ever_verified?: boolean;
  verification_logs: { verification_status: SellerVerificationStatus }[];
}): boolean {
  if (typeof seller.was_ever_verified === "boolean") return seller.was_ever_verified;
  return seller.verification_logs.some((log) => log.verification_status === "verified");
}

/** Why the verification cannot move from `current` to `target`, or null. */
export function verificationBlock(
  current: SellerVerificationStatus,
  target: SellerVerificationStatus,
  everVerified: boolean,
): string | null {
  if (current === target) return null;
  if (current === "rejected" && target !== "pending") {
    return "A Rejected seller can only be moved to Pending next.";
  }
  if (target === "rejected" && everVerified) {
    return "A seller who has ever been Verified can never be Rejected.";
  }
  return null;
}

/** The account statuses the rules allow for a verification status. */
export function allowedAccountStatuses(verification: SellerVerificationStatus): SellerStatus[] {
  switch (verification) {
    case "verified":
      return ["active", "inactive", "suspended"];
    case "unverified":
      return ["inactive", "suspended"];
    case "pending":
      return ["inactive"];
    default:
      return ["suspended"];
  }
}

/** Why the account status cannot be set to `target` while the verification is
 * `verification`, or null. */
export function accountStatusBlock(
  verification: SellerVerificationStatus,
  target: SellerStatus,
): string | null {
  if (allowedAccountStatuses(verification).includes(target)) return null;
  if (verification === "pending") return "While the verification is Pending the account is Inactive.";
  if (verification === "rejected") return "While the verification is Rejected the account is Suspended.";
  return "An Unverified seller cannot be Active.";
}

export type AccessTier = "full" | "profile_only" | "locked";

export const ACCESS_TIER_LABELS: Record<AccessTier, string> = {
  full: "Full access",
  profile_only: "Profile only",
  locked: "Locked",
};

export const ACCESS_TIER_TEXT: Record<AccessTier, string> = {
  full: "The seller can use every seller feature.",
  profile_only:
    "The seller can log in and change only their own profile and documents (and Resubmit, if Rejected). Every other seller feature is refused.",
  locked:
    "The seller can log in and see their account, but cannot change anything, not even their profile.",
};

/** The seller's tier from the server's two booleans. An older server that does
 * not send them is covered by the documented rules. */
export function accessTier(seller: {
  can_operate?: boolean;
  can_edit_profile?: boolean;
  verification_status: SellerVerificationStatus;
  status: SellerStatus;
}): AccessTier {
  if (typeof seller.can_operate === "boolean" && typeof seller.can_edit_profile === "boolean") {
    if (seller.can_operate) return "full";
    return seller.can_edit_profile ? "profile_only" : "locked";
  }
  if (seller.verification_status === "verified") {
    return seller.status === "active" ? "full" : "locked";
  }
  return "profile_only";
}

export function accessTierBadgeClass(tier: AccessTier): string {
  return tier === "full" ? styles.badgeGreen : tier === "profile_only" ? styles.badgeAmber : styles.badgeRed;
}

export function verificationBadgeClass(status: SellerVerificationStatus): string {
  switch (status) {
    case "verified":
      return styles.badgeGreen;
    case "pending":
      return styles.badgeAmber;
    case "rejected":
      return styles.badgeRed;
    default:
      return styles.badgeGray;
  }
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}
