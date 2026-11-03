import type { BidTier } from "@/lib/admin-bids-api";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { formatAmount } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import { tierText } from "@/app/(admin)/admin/(protected)/jobs/job-utils";

/** The price options of a bid, with the hired one marked. */
export function BidTierTable({ tiers, hiredId }: { tiers: BidTier[]; hiredId: number | null }) {
  return (
    <div className={management.tableWrap}>
      <table className={management.table}>
        <thead>
          <tr>
            <th>Price</th>
            <th>Duration</th>
            <th>Total</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={tier.id}>
              <td>{tierText(tier.price, tier.price_type)}</td>
              <td>{tier.price_type === "fixed" ? "—" : tier.duration}</td>
              <td className={management.primaryText}>{formatAmount(tier.total_price)}</td>
              <td className={management.secondaryText}>{tier.description ?? "—"}</td>
              <td>
                {hiredId === tier.id && (
                  <span className={`${management.badge} ${management.badgeGreen}`}>Hired</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
