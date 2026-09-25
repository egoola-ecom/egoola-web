"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActorType, AuthSession, getSession } from "./auth";

/**
 * Redirects to `loginPath` if there's no stored session for `actorType`.
 * Returns `checked: false` while the check is in flight (avoids a flash
 * of protected content before the redirect happens).
 */
export function useAuthGuard(actorType: ActorType, loginPath: string) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so the session can only be
    // read once mounted on the client — hence the effect instead of a
    // useState initializer (which would mismatch the server-rendered HTML).
    const current = getSession(actorType);
    if (!current) {
      router.replace(loginPath);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(current);
    setChecked(true);
  }, [actorType, loginPath, router]);

  return { session, checked };
}
