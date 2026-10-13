"use client";

import { useEffect, useState } from "react";
import { countSellerRequests } from "./accounts-api";

/** Fired after anything that can move a seller out of the queue (approve,
 * reject, suspend, delete…), so the menu badge counts again. */
const CHANGED_EVENT = "egoola:seller-requests-changed";

export function notifySellerRequestsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

/**
 * The number behind the "Seller Requests (n)" menu badge. The queue itself
 * has no count, so this asks the normal seller list for
 * `is_seller_request=true&limit=1`. `null` while unknown (not loaded yet, or
 * the call failed — the badge is then simply left out).
 */
export function useSellerRequestCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    function load() {
      countSellerRequests()
        .then((n) => {
          if (!cancelled) setCount(n);
        })
        .catch(() => {
          // A failed badge must never break the page around it.
        });
    }
    load();
    window.addEventListener(CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED_EVENT, load);
    };
  }, [enabled]);

  return count;
}
