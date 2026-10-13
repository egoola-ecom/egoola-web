"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaginatedResponse } from "./accounts-api";
import { ApiError, apiErrorDetail } from "./api";
import { AuthError, clearSession } from "./auth";

export function describeError(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  if (err instanceof ApiError) {
    const detail = apiErrorDetail(err);
    if (detail) return detail;
    if (err.status === 403) return "You are not allowed to do this.";
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

/** One entry of an error array: usually a plain message, but a nested list
 * serializer (e.g. a listing's price_tiers) reports one {field: [messages]}
 * object per row — the row's number is kept so the admin can find it. */
function describeErrorItem(item: unknown, index: number): string[] {
  if (item && typeof item === "object") {
    return Object.entries(item as Record<string, unknown>).map(
      ([field, messages]) =>
        `Row ${index + 1} ${field.replace(/_/g, " ")}: ${Array.isArray(messages) ? messages.join(" ") : String(messages)}`,
    );
  }
  return [String(item)];
}

export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Turns a 400 validation error body into a flat {field: [messages]} map.
 * Handles both the flat shape ({name: [...]}) and one level of nesting
 * (e.g. Seller's {info: {business_type: [...]}}) by surfacing the nested
 * key directly, since that matches the form's own field names. Rows of a
 * nested list ({"skus": {"0": {"price": "..."}}}) are summarised under the
 * list's key ("Row 1 price: …") and also keyed "skus.0.price".
 */
export function parseFieldErrors(err: unknown): { fieldErrors: FieldErrors; message: string | null } {
  if (err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object") {
    const raw = err.body as Record<string, unknown>;
    const flattened: FieldErrors = {};
    for (const [key, value] of Object.entries(raw)) {
      if (Array.isArray(value)) {
        flattened[key] = value.flatMap(describeErrorItem);
      } else if (typeof value === "string") {
        // Some views (e.g. listing bulk-moderate) answer {"note": "message"}
        // rather than DRF's usual {"note": ["message"]}.
        flattened[key] = [value];
      } else if (value && typeof value === "object") {
        for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
          if (Array.isArray(nestedValue)) {
            flattened[nestedKey] = nestedValue.map(String);
          } else if (nestedValue && typeof nestedValue === "object" && /^\d+$/.test(nestedKey)) {
            // A nested list serializer can report its rows as {"0": {field:
            // [messages]}} — keep them under the list's own key.
            flattened[key] = [
              ...(flattened[key] ?? []),
              ...describeErrorItem(nestedValue, Number(nestedKey)),
            ];
            // Also keep each row's own messages under "<list>.<row>.<field>"
            // (row is the 0-based position sent) so a screen can show an error
            // beside the row it belongs to, e.g. "skus.0.price".
            for (const [rowField, messages] of Object.entries(
              nestedValue as Record<string, unknown>,
            )) {
              flattened[`${key}.${nestedKey}.${rowField}`] = Array.isArray(messages)
                ? messages.map(String)
                : [String(messages)];
            }
          }
        }
      }
    }
    // A 400 whose shape isn't recognised must not fail silently.
    return {
      fieldErrors: flattened,
      message:
        Object.keys(flattened).length === 0 ? "Please check the form and try again." : null,
    };
  }
  return { fieldErrors: {}, message: describeError(err) };
}
