"use client";

import { useRouter } from "next/navigation";
import { ActorType, AuthSession, logout } from "@/lib/auth";
import styles from "./actor-topbar.module.css";

export function ActorTopbar({
  session,
  actorType,
  loginPath,
}: {
  session: AuthSession;
  actorType: ActorType;
  loginPath: string;
}) {
  const router = useRouter();

  return (
    <header className={styles.topbar}>
      <span className={styles.logo}>
        <span className={styles.logoDark}>eg</span>
        <span className={styles.logoGreen}>oola</span>
      </span>
      <div className={styles.right}>
        <span className={styles.userName}>{session.name}</span>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => {
            logout(actorType);
            router.replace(loginPath);
          }}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
