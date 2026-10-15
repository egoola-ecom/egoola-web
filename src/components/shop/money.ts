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
