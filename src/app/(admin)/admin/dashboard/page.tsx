import Link from "next/link";

export const metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>
        The admin panel lives here: seller management and verification, listing
        moderation, user and admin management, financial oversight, and site
        content (CMS).
      </p>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </div>
  );
}