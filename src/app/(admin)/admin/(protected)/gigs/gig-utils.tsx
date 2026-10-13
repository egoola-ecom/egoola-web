import { GigPriceType } from "@/lib/gig-api";
import { formatAmount } from "../catalog/listings/listing-utils";
import styles from "../management.module.css";

/** The five price types of a gig package. `per` is the unit the rate is for;
 * `fixed` is one price for the whole job. */
export const PRICE_TYPE_OPTIONS: {
  value: GigPriceType;
  label: string;
  /** The price field's label: "Rate (per hour)". */
  per: string;
  /** Short form after an amount: "৳450 / hour". */
  unit: string;
}[] = [
  { value: "hourly", label: "Hourly", per: "per hour", unit: "hour" },
  { value: "daily", label: "Daily", per: "per day", unit: "day" },
  { value: "weekly", label: "Weekly", per: "per week", unit: "week" },
  { value: "monthly", label: "Monthly", per: "per month", unit: "month" },
  { value: "fixed", label: "Fixed price", per: "fixed price", unit: "" },
];

export function priceTypeLabel(value: GigPriceType | null | undefined): string {
  return PRICE_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "—";
}

/** "৳450 / hour" for a rate, a plain "৳9,000" for a fixed price. */
export function rateText(
  amount: string,
  priceType: GigPriceType | null | undefined,
  currency?: string,
): string {
  const unit = PRICE_TYPE_OPTIONS.find((opt) => opt.value === priceType)?.unit;
  return unit ? `${formatAmount(amount, currency)} / ${unit}` : formatAmount(amount, currency);
}

/** A rate as the gig screens show it: the charged rate with the original
 * struck through when a discount makes it lower, and what it is for. A gig's
 * own price is the LOWEST rate among its active packages ("From"). */
export function RateDisplay({
  price,
  discountedPrice,
  priceType,
  currency,
  from = false,
}: {
  price: string | null;
  discountedPrice: string | null;
  priceType: GigPriceType | null | undefined;
  currency?: string;
  from?: boolean;
}) {
  if (price == null || discountedPrice == null) {
    return <span className={styles.secondaryText}>No active package</span>;
  }
  const unit = PRICE_TYPE_OPTIONS.find((opt) => opt.value === priceType)?.unit;
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
      {unit ? <span className={styles.secondaryText}> / {unit}</span> : null}
      {!unit && priceType === "fixed" ? <span className={styles.secondaryText}> fixed</span> : null}
    </span>
  );
}
