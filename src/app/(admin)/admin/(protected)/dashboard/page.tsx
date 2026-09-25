import Link from "next/link";
import styles from "./dashboard.module.css";

export const metadata = { title: "Admin Dashboard" };

const SECTIONS = [
  {
    href: "/admin/admins",
    title: "Admins",
    text: "Manage admin accounts, roles (super admin, admin, moderator, support), and access status.",
  },
  {
    href: "/admin/sellers",
    title: "Sellers",
    text: "Manage seller accounts, business profiles, and verification/active status.",
  },
  {
    href: "/admin/buyers",
    title: "Buyers",
    text: "Manage buyer accounts and their active/suspended status.",
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className={styles.heading}>Admin Dashboard</h1>
      <p className={styles.subheading}>
        Seller management and verification, listing moderation, user and admin
        management, financial oversight, and site content (CMS) will live
        here as they&apos;re built out phase by phase.
      </p>

      <div className={styles.cardGrid}>
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className={styles.card}>
            <p className={styles.cardTitle}>{section.title}</p>
            <p className={styles.cardText}>{section.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
