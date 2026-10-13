import { API_BASE_URL } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: init.cache ?? "no-store",
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, response.statusText, body);
  }

  return (await response.json()) as T;
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** The server's `{"detail": "..."}` message from a failed call, or null.
 * 401/403/404/409 answers carry their explanation here. */
export function apiErrorDetail(err: unknown): string | null {
  if (err instanceof ApiError && err.body && typeof err.body === "object") {
    const detail = (err.body as Record<string, unknown>).detail;
    if (typeof detail === "string") return detail;
  }
  return null;
}

/** True for a 403 (signed in, but this role may not do it) — shown as a
 * "not allowed" state, never as a redirect to the login page. */
export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

/** True for a 409 — the server refused a delete because something still uses
 * the record (category, brand, attribute, value). The caller offers
 * "Deactivate" instead. */
export function isConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}
