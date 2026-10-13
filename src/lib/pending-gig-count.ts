"use client";

import { useEffect, useState } from "react";
import { countPendingGigs } from "./gig-api";

/** Fired after anything that can move a gig out of the pending list
 * (approve, reject, request changes, delete…), so the menu badge counts
 * again. */
const CHANGED_EVENT = "egoola:pending-gigs-changed";

export function notifyPendingGigsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

/**
 * The number behind the "Pending Gigs (n)" menu badge. The pending list has no
 * count (cursor paging), so this asks the normal list for
 * `status=pending&limit=1`. `null` while unknown (not loaded yet, or the call
 * failed — the badge is then simply left out).
 */
export function usePendingGigCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    function load() {
      countPendingGigs()
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
