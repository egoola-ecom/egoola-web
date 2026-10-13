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

/** Words for the account switch. `inactive` is NOT "not approved": a verified
 * seller can be inactive (paused), and a new sign-up is inactive until an
 * admin activates it. */
export const STATUS_LABELS: Record<SellerStatus, string> = {
  active: "Active",
  inactive: "Inactive (paused / awaiting activation)",
  suspended: "Suspended",
};

export const STATUS_SHORT_LABELS: Record<SellerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

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
