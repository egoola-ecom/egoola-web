import { ApiError, apiFetch } from "@/lib/api";

export type QueryValue = string | number | boolean | null | undefined;

/** `?a=1&b=x`, leaving out empty values (an empty filter means "no filter"). */
export function toQuery(params: Record<string, QueryValue>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    q.set(key, String(value));
  }
  const text = q.toString();
  return text ? `?${text}` : "";
}

/** A public (no login) read. `path` is the full address from `ENDPOINTS.public`.
 * The server answers a bad filter with 400
 * `{field: [message]}` and an unknown / invisible id or a page past the last
 * with 404 `{detail}`. */
export function publicGet<T>(path: string, params: Record<string, QueryValue> = {}): Promise<T> {
  return apiFetch<T>(`${path}${toQuery(params)}`);
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export function isInvalidPage(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 404 &&
    typeof err.body === "object" &&
    err.body !== null &&
    (err.body as { detail?: unknown }).detail === "Invalid page."
  );
}

/** The first message of a 400 `{field: [message]}`, or the generic line. */
export function filterErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 400 && err.body && typeof err.body === "object") {
    for (const value of Object.values(err.body as Record<string, unknown>)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      if (typeof value === "string") return value;
    }
  }
  return "Something went wrong. Please try again.";
}
