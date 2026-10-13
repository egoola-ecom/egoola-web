import { ApiError, isForbidden } from "./api";

/** The message for a detail / edit screen whose load failed: a 403 is "not
 * allowed" (signed in, wrong role — never a redirect to login), a 404 is "not
 * found" (deleted, another seller's, or the wrong kind), anything else is the
 * generic try-again line. */
export function describeLoadError(err: unknown, notFound: string, generic: string): string {
  if (isForbidden(err)) return "You are not allowed to see this.";
  if (err instanceof ApiError && err.status === 404) return notFound;
  return generic;
}
