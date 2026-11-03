import { ApiError } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import { filterErrorText } from "./public-fetch";

/** The session is gone (expired or the account was suspended): sign in again. */
export function isSignedOut(err: unknown): boolean {
  return err instanceof AuthError;
}

/** What to show for a failed cart or wishlist call. A 400 carries the server's
 * own reason (`{"qty": ["Not enough stock."]}`); stock can change between page
 * load and click, so that text is the real answer. */
export function cartErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 400) return filterErrorText(err);
  if (err instanceof ApiError && err.status === 404) return "This item is no longer in your cart.";
  return "Something went wrong. Please try again.";
}
