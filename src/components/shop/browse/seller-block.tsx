import Link from "next/link";
import type { SellerRef } from "@/lib/buyer/types";
import { resolveMediaUrl } from "@/lib/env";
import { SHOP } from "../shop-links";

/** "Sold by" with a link to the seller's page. */
export function SellerBlock({ seller }: { seller: SellerRef | null }) {
  if (!seller) return <p className="text-muted mb-0">Sold by Egoola</p>;
  return (
    <Link href={SHOP.seller(seller.id)} className="d-flex align-items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveMediaUrl(seller.profile_pic_url) ?? "/shop/images/no-img.jpg"}
        alt=""
        width={40}
        height={40}
        className="rounded-circle mr-2"
        style={{ objectFit: "cover" }}
      />
      <span>
        <small className="text-muted d-block">Sold by</small>
        <strong>{seller.name}</strong>
      </span>
    </Link>
  );
}

export function placeText(location: { country: { name: string } | null; state: { name: string } | null; city: { name: string } | null; thana: { name: string } | null }): string {
  return [location.thana, location.city, location.state, location.country]
    .filter((p): p is { name: string } => p != null)
    .map((p) => p.name)
    .join(", ");
}
