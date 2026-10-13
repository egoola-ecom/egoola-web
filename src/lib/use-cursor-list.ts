"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CursorResponse } from "./accounts-api";
import { AuthError, clearSession } from "./auth";
import { describeError } from "./use-managed-list";

/**
 * List state for endpoints with CURSOR pagination ({next, previous, results},
 * no `count`, no page numbers) — the Seller Request queue.
 *
 * The first page is asked for with the search/filters; every later page is
 * the server's own `next` link, followed exactly as given (it already carries
 * the filters and the opaque cursor). Whenever the search, a filter or the
 * sort changes, the list starts again from the first page — an old cursor is
 * never reused with a different query. Redirects to admin login if the
 * session expired.
 */
export function useCursorList<T extends { id: number }>(
  fetcher: (target: URLSearchParams | string) => Promise<CursorResponse<T>>,
  search: string,
  filters: Record<string, string | undefined>,
  pageSize = 20,
) {
  const router = useRouter();
  const queryKey = JSON.stringify({ search, filters, pageSize });

  const [items, setItems] = useState<T[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Bumped for every fresh start, so an answer that arrives after the query
  // changed (or after a reload) is dropped instead of mixed into the new list.
  const generation = useRef(0);

  const handleFailure = useCallback(
    (err: unknown) => {
      if (err instanceof AuthError) {
        clearSession("admin");
        router.replace("/admin/login");
        return;
      }
      setError(describeError(err));
    },
    [router],
  );

  useEffect(() => {
    const mine = ++generation.current;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setItems([]);
    setNext(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    if (search) params.set("search", search);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }

    fetcher(params)
      .then((response) => {
        if (generation.current !== mine) return;
        setItems(response.results);
        setNext(response.next);
      })
      .catch((err) => {
        if (generation.current !== mine) return;
        handleFailure(err);
      })
      .finally(() => {
        if (generation.current === mine) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, reloadToken]);

  const loadMore = useCallback(() => {
    if (!next || loading || loadingMore) return;
    const mine = generation.current;
    setLoadingMore(true);
    setError(null);
    fetcher(next)
      .then((response) => {
        if (generation.current !== mine) return;
        // A row can never appear twice, even if the server repeats one.
        setItems((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...response.results.filter((item) => !seen.has(item.id))];
        });
        setNext(response.next);
      })
      .catch((err) => {
        if (generation.current !== mine) return;
        handleFailure(err);
      })
      .finally(() => {
        if (generation.current === mine) setLoadingMore(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, loading, loadingMore, handleFailure]);

  /** Start again from the first page (after an approve/reject, for example). */
  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { items, loading, loadingMore, error, hasMore: next !== null, loadMore, refetch };
}
