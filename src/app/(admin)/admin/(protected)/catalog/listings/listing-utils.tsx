import {
  ListingPostedByRole,
  ListingStatus,
  ListingType,
} from "@/lib/listing-api";
import styles from "../../management.module.css";

export const LISTING_STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "changes_requested", label: "Changes requested" },
];

export const LISTING_TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "used", label: "Used" },
  { value: "village", label: "Village" },
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "brand", label: "Brand" },
];

export const POSTED_BY_ROLE_OPTIONS: { value: ListingPostedByRole; label: string }[] = [
  { value: "seller_offer", label: "Seller offer" },
  { value: "buyer_request", label: "Buyer request" },
];

/** Statuses where the backend refuses to save without a note. */
export function statusNeedsNote(status: ListingStatus | string): boolean {
  return status === "rejected" || status === "changes_requested";
}

export function statusLabel(status: ListingStatus): string {
  return LISTING_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status;
}

export function listingTypeLabel(value: ListingType | null): string {
  return LISTING_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "—";
}

export function statusBadgeClass(status: ListingStatus): string {
  switch (status) {
    case "approved":
      return styles.badgeGreen;
    case "pending":
    case "changes_requested":
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

export function formatAmount(value: string, currency = "BDT"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  const text = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency === "BDT" ? `৳${text}` : `${currency} ${text}`;
}

/** Price as the listing screens show it: the charged price on its own when
 * there is no discount, otherwise the charged price with the original struck
 * through. `discounted_price` is always present (equals `price` when there is
 * no discount), so "discounted" means strictly lower. A listing's own price is
 * the "from" price of its cheapest active SKU and is null when no SKU is
 * active; pass `from` to label it that way. */
export function PriceDisplay({
  price,
  discountedPrice,
  currency,
  from = false,
}: {
  price: string | null;
  discountedPrice: string | null;
  currency?: string;
  from?: boolean;
}) {
  if (price == null || discountedPrice == null) {
    return <span className={styles.secondaryText}>No active SKU</span>;
  }
  const hasDiscount = Number(discountedPrice) < Number(price);
  return (
    <span>
      {from && <span className={styles.secondaryText}>From </span>}
      <span className={styles.primaryText}>{formatAmount(discountedPrice, currency)}</span>
      {hasDiscount && (
        <>
          {" "}
          <span className={styles.strikePrice}>{formatAmount(price, currency)}</span>
        </>
      )}
    </span>
  );
}
