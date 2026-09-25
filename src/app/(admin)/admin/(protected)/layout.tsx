import Link from "next/link";

export default function AdminProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav>
          <ul>
            <li>
              <Link href="/admin/dashboard">Dashboard</Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
