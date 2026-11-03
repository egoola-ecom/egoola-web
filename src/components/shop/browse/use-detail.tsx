"use client";

import { useEffect, useState } from "react";
import { isNotFound } from "@/lib/buyer/public-fetch";

export type DetailState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "notFound" }
  | { status: "error" };

/** Load one record for a detail screen. A 404 (unknown id, a record that is
 * not visible, or a gig id on a product route) is "not found", never a crash. */
export function useDetail<T>(load: () => Promise<T>, key: string | number): DetailState<T> {
  const [state, setState] = useState<DetailState<T>>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: isNotFound(err) ? "notFound" : "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** The empty and failed states shared by the three detail screens. */
export function DetailMessage({ state, what }: { state: DetailState<unknown>; what: string }) {
  if (state.status === "loading") return <p className="text-muted text-center py-5">Loading…</p>;
  if (state.status === "notFound") {
    return (
      <div className="text-center py-5">
        <h4>{what} not found</h4>
        <p className="text-muted">It may have been removed, or the link is wrong.</p>
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-danger text-center py-5">We couldn&apos;t load this page. Please try again.</p>;
  }
  return null;
}
