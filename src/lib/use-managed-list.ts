"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaginatedResponse } from "./accounts-api";
import { ApiError } from "./api";
import { AuthError, clearSession } from "./auth";

function describeError(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  if (err instanceof ApiError) {
    if (err.body && typeof err.body === "object" && "detail" in err.body) {
      const detail = (err.body as Record<string, unknown>).detail;
      if (typeof detail === "string") return detail;
    }
    return "Something went wrong talking to the server.";
  }
  return "Something went wrong talking to the server.";
}

/**
 * Shared list-fetching state for the Admin/Seller/Buyer management screens:
 * pagination (limit/offset), search, extra filters, loading/error state, and
 * a manual refetch trigger. Redirects to admin login if the session expired.
 */
export function useManagedList<T>(
  fetcher: (params: URLSearchParams) => Promise<PaginatedResponse<T>>,
  search: string,
  filters: Record<string, string | undefined>,
  pageSize = 20,
) {
  const router = useRouter();
  const filtersKey = JSON.stringify(filters);

  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Jump back to page 1 whenever the search/filter query itself changes.
  // Adjusting state during render (rather than in an effect) is the
  // documented React pattern for this: https://react.dev/learn/you-might-not-need-an-effect
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  const [prevSearch, setPrevSearch] = useState(search);
  if (filtersKey !== prevFiltersKey || search !== prevSearch) {
    setPrevFiltersKey(filtersKey);
    setPrevSearch(search);
    setOffset(0);
  }

  useEffect(() => {
    let cancelled = false;
    // Standard fetch-in-effect loading pattern: this run's own state is
    // reset synchronously so `loading`/`error` reflect the in-flight
    // request, not the previous one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));
    if (search) params.set("search", search);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }

    fetcher(params)
      .then((response) => {
        if (cancelled) return;
        setItems(response.results);
        setCount(response.count);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AuthError) {
          clearSession("admin");
          router.replace("/admin/login");
          return;
        }
        setError(describeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, search, filtersKey, reloadToken, pageSize]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { items, count, loading, error, offset, setOffset, pageSize, refetch };
}

export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Turns a 400 validation error body into a flat {field: [messages]} map.
 * Handles both the flat shape ({name: [...]}) and one level of nesting
 * (e.g. Seller's {info: {business_type: [...]}}) by surfacing the nested
 * key directly, since that matches the form's own field names.
 */
export function parseFieldErrors(err: unknown): { fieldErrors: FieldErrors; message: string | null } {
  if (err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object") {
    const raw = err.body as Record<string, unknown>;
    const flattened: FieldErrors = {};
    for (const [key, value] of Object.entries(raw)) {
      if (Array.isArray(value)) {
        flattened[key] = value.map(String);
      } else if (value && typeof value === "object") {
        for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
          if (Array.isArray(nestedValue)) {
            flattened[nestedKey] = nestedValue.map(String);
          }
        }
      }
    }
    return { fieldErrors: flattened, message: null };
  }
  return { fieldErrors: {}, message: describeError(err) };
}
