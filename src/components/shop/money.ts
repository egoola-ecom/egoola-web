/** "15000.00" -> "15000" (the legacy site shows whole takas), with the taka sign. */
export function taka(amount: string | number): string {
  const n = Number(amount);
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ৳`;
}

export const PRICE_UNIT: Record<string, string> = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  monthly: "month",
  fixed: "job",
};

/** "3 hours", "1 job". `fixed` is one job whatever the count. */
export function durationText(count: number, priceType: string | null): string {
  const unit = (priceType && PRICE_UNIT[priceType]) || "unit";
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}
