"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useAuthGuard } from "@/lib/use-auth-guard";
import styles from "./admin-shell.module.css";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/buyers", label: "Buyers" },
];

export default function AdminProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, checked } = useAuthGuard("admin", "/admin/login");

  if (!checked || !session) {
    return <div className={styles.checking}>Checking session…</div>;
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logoRow}>
          <span className={styles.logo}>
            <span className={styles.logoDark}>eg</span>
            <span className={styles.logoGreen}>oola</span>
          </span>
          <span className={styles.badge}>Admin Panel</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${
                pathname.startsWith(item.href) ? styles.navLinkActive : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.userName}>{session.name}</span>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => {
              logout("admin");
              router.replace("/admin/login");
            }}
          >
            Log out
          </button>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
