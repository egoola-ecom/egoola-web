export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const API_VERSION = "v1";

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

/**
 * The API returns media URLs (profile pictures, uploaded documents) as
 * paths relative to the backend's own origin (e.g. "/media/..."), not
 * full URLs — resolve them against the API host so they don't get
 * requested from the frontend's own origin instead.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}