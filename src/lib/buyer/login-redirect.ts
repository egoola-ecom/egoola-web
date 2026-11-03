import { SHOP } from "@/components/shop/shop-links";

/** Where a buyer lands after signing in. Only a path inside Buyer Web is
 * honoured, so a crafted `?next=` can never send someone to another site. */
export function safeBuyerNext(next: string | null | undefined): string {
  if (!next || !/^\/buyer(?:[/?#]|$)/.test(next) || next.startsWith("//")) return SHOP.home;
  return next;
}

export function loginUrlFor(next: string): string {
  return `${SHOP.login}?next=${encodeURIComponent(next)}`;
}
