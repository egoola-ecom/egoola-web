"use client";

import { useEffect, useState } from "react";
import { AuthError, getSession } from "@/lib/auth";
import { getCartSummary, type CartSummary } from "../cart-api";

// One call (GET /buyer/cart/summary/) gives every active cart and the total
// line count, so the header badge and the cart list share it. Anything that
// changes a cart calls `notifyCartChanged()` so they refresh.

const EVENT = "egoola:cart-changed";
const NONE: CartSummary = { item_count: 0, carts: [] };

export function notifyCartChanged() {
  window.dispatchEvent(new Event(EVENT));
}

/** `null` while the first answer is on its way. Signed out reads as no carts. */
export function useCartSummary(): CartSummary | null {
  const [summary, setSummary] = useState<CartSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (!getSession("buyer")) {
        setSummary(NONE);
        return;
      }
      getCartSummary()
        .then((next) => {
          if (!cancelled) setSummary(next);
        })
        .catch((err) => {
          if (!cancelled && err instanceof AuthError) setSummary(NONE);
        });
    };
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, refresh);
    };
  }, []);

  return summary;
}
