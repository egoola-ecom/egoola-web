import type { ListingInput, ListingPriceTierInput } from "@/lib/listing-api";
import type { SellerListingDetail, SellerListingInput } from "@/lib/seller-listing-api";

/** What the form builds, as the seller API accepts it. A seller never sends
 * seller, buyer, posted_by_role, status or currency; the form already leaves
 * them out, this makes sure. */
export function toSellerInput(input: ListingInput): SellerListingInput {
  const {
    seller: _seller,
    buyer: _buyer,
    posted_by_role: _role,
    status: _status,
    currency: _currency,
    ...rest
  } = input;
  void _seller;
  void _buyer;
  void _role;
  void _status;
  void _currency;
  return rest;
}

const PLACE_KEYS = ["country", "state", "city", "thana"] as const;
const DATE_KEYS = ["available_from", "available_to"] as const;
const AMOUNT_KEYS = ["hourly_rate"] as const;

/** Blank values compare equal: the server returns null for what the form
 * shows as "". */
function norm(value: unknown): string {
  if (value == null || value === "") return "";
  return JSON.stringify(value);
}

function sameInstant(a: unknown, b: unknown): boolean {
  if (!a || !b) return !a && !b;
  return new Date(String(a)).getTime() === new Date(String(b)).getTime();
}

function sameAmount(a: unknown, b: unknown): boolean {
  if (a == null || a === "" || b == null || b === "") return (a ?? "") === (b ?? "");
  return Number(a) === Number(b);
}

/** A tier as the server holds it vs as the form sends it: the server repeats
 * `price` as `discounted_price` when there is no discount. */
function tierKey(tier: {
  min_qty: number;
  max_qty: number | null;
  price: string;
  discounted_price: string | null;
  listing_sku?: number | null;
}): string {
  const discount =
    tier.discounted_price != null && Number(tier.discounted_price) < Number(tier.price)
      ? Number(tier.discounted_price)
      : null;
  return JSON.stringify([
    tier.min_qty,
    tier.max_qty ?? null,
    Number(tier.price),
    discount,
    tier.listing_sku ?? null,
  ]);
}

function sameTiers(sent: ListingPriceTierInput[], saved: SellerListingDetail["price_tiers"]): boolean {
  if (sent.length !== saved.length) return false;
  const a = sent.map(tierKey).sort();
  const b = saved.map(tierKey).sort();
  return a.every((key, index) => key === b[index]);
}

/** Only the fields that really differ from the saved listing — a PATCH is
 * meant to carry just what changed. `skus` already holds only the changed or
 * new SKUs; `note` (the message to the reviewer) is always kept. */
export function sellerChanges(
  body: SellerListingInput,
  saved: SellerListingDetail,
): Partial<SellerListingInput> {
  const current = saved as unknown as Record<string, unknown>;
  const changed: Record<string, unknown> = {};
  const entries = Object.entries(body) as [string, unknown][];

  // The place ids are one branch of a tree: when one changes, send all four.
  const placeChanged = PLACE_KEYS.some((key) => {
    const entry = entries.find(([name]) => name === key);
    return entry !== undefined && norm(entry[1]) !== norm(current[key]);
  });

  for (const [key, value] of entries) {
    if (value === undefined) continue;
    if (key === "note" || key === "skus" || key === "attributes") {
      changed[key] = value;
    } else if ((PLACE_KEYS as readonly string[]).includes(key)) {
      if (placeChanged) changed[key] = value;
    } else if (key === "price_tiers") {
      if (!sameTiers(value as ListingPriceTierInput[], saved.price_tiers)) changed[key] = value;
    } else if ((DATE_KEYS as readonly string[]).includes(key)) {
      if (!sameInstant(value, current[key])) changed[key] = value;
    } else if ((AMOUNT_KEYS as readonly string[]).includes(key)) {
      if (!sameAmount(value, current[key])) changed[key] = value;
    } else if (key === "urgent") {
      // The server keeps "not set" for a listing that never had it ticked.
      if (Boolean(value) !== Boolean(current[key])) changed[key] = value;
    } else if (norm(value) !== norm(current[key])) {
      changed[key] = value;
    }
  }
  return changed as Partial<SellerListingInput>;
}
