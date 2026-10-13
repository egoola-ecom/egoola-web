"use client";

import { createContext, useContext } from "react";
import type { SellerMe } from "@/lib/seller-me-api";

export interface SellerContextValue {
  /** The seller's own profile and the two switches, loaded by the layout. */
  me: SellerMe;
  /** Use the answer of a save / resubmit directly (same body as GET). */
  setMe: (me: SellerMe) => void;
  /** Ask the server again — after every change, so media URLs are fresh. */
  reload: () => Promise<SellerMe | null>;
  /** A failed call: a 401 that survives the refresh (suspended, deleted,
   * session over) clears the session and goes to /login. Returns true then. */
  handleAuthError: (err: unknown) => boolean;
}

export const SellerContext = createContext<SellerContextValue | null>(null);

export function useSeller(): SellerContextValue {
  const value = useContext(SellerContext);
  if (!value) throw new Error("useSeller must be used inside the seller layout.");
  return value;
}
