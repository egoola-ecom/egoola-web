"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginUrlFor } from "@/lib/buyer/login-redirect";

/** Keeps a signed-out visitor off a buyer-only screen (cart, favourites,
 * projects, orders...). They go to the login page and come back here after
 * signing in. Nothing of the screen renders until the session is checked, so
 * there is no flash of protected content. */
export function RequireBuyer({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (getSession("buyer")) {
      // localStorage is only there on the client, so this runs after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAllowed(true);
    } else {
      router.replace(loginUrlFor(search ? `${pathname}?${search}` : pathname));
    }
  }, [pathname, search, router]);

  return allowed ? <>{children}</> : null;
}
