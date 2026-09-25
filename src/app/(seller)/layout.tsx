import Link from "next/link";

export default function SellerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="seller-layout">
      <aside className="seller-sidebar">
        <nav>
          <ul>
            <li>
              <Link href="/seller">Dashboard</Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="seller-main">{children}</main>
    </div>
  );
}