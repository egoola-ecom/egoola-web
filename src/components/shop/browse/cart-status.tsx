"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCart, type CartType } from "@/lib/buyer/cart-api";
import { SHOP } from "../shop-links";

/** `/buyer/cart?type=&seller=` for one seller's cart (0 = admin-owned listings). */
export function cartUrl(type: CartType, sellerId: number | null): string {
  return `${SHOP.cart}?type=${type}&seller=${sellerId ?? 0}`;
}

/** "N items in your cart with this seller" with a link, from a seller-scoped
 * GET (a `null` answer just means nothing to show). Refreshes after an add. */
export function CartStatus({ type, sellerId }: { type: CartType; sellerId: number | null }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (!getSession("buyer")) return;
      getCart(type, sellerId ?? 0)
        .then((cart) => {
          if (!cancelled) setCount(cart?.items.length ?? 0);
        })
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener("egoola:cart-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("egoola:cart-changed", refresh);
    };
  }, [type, sellerId]);

  if (count === 0) return null;
  return (
    <p className="small mb-0 mt-2">
      <i className="fas fa-shopping-cart text-success" /> {count} {count === 1 ? "item" : "items"} in your{" "}
      {type === "product" ? "product" : "service"} cart with {sellerId ? "this seller" : "Egoola"}.{" "}
      <Link href={cartUrl(type, sellerId)}>View cart</Link>
    </p>
  );
}
