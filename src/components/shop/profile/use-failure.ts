import { useRouter } from "next/navigation";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { parseFieldErrors, type FieldErrors } from "@/lib/use-managed-list";

/** What to show when a call fails: a signed-out buyer goes to sign in, anything
 * else is a message. Shared by the three sections. */
export function useFailure() {
  const router = useRouter();
  return (err: unknown): { fields: FieldErrors; general: string | null } | null => {
    if (isSignedOut(err)) {
      router.replace(loginUrlFor(window.location.pathname));
      return null;
    }
    const { fieldErrors, message } = parseFieldErrors(err);
    const hasFields = Object.keys(fieldErrors).length > 0;
    return {
      fields: fieldErrors,
      general: message ?? (hasFields ? null : "Something went wrong. Please try again."),
    };
  };
}
