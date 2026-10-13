"use client";

import { useState } from "react";
import { getSession } from "@/lib/auth";
import styles from "../management.module.css";

/** Admin Management is super-admin only. A plain admin gets 403 from every
 * /accounts/admins/ call, so the whole section is replaced by a "not allowed"
 * state instead of a list that can only fail. A session saved before the login
 * carried `admin_type` is let through — the server still enforces the rule and
 * the screens show its 403 message. */
export default function AdminsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [role] = useState(() => getSession("admin")?.admin_type);

  if (role === "admin") {
    return (
      <div>
        <h1 className={styles.title}>Admins</h1>
        <p className={styles.errorBanner}>
          Only a super-admin can access Admin Management. Ask a super-admin if you need changes to
          admin accounts.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
