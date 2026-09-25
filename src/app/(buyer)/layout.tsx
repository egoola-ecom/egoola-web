import Link from "next/link";

export default function BuyerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="buyer-layout">
      <aside className="buyer-sidebar">
        <nav>
          <ul>
            <li>
              <Link href="/buyer">Dashboard</Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="buyer-main">{children}</main>
    </div>
  );
}