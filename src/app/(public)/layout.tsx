import Link from "next/link";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="public-layout">
      <header className="public-header">
        <Link href="/" className="public-header__brand">
          Egoola
        </Link>
        <nav className="public-header__nav">
          <Link href="/login">Login</Link>
        </nav>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <p>&copy; {new Date().getFullYear()} Egoola.com</p>
      </footer>
    </div>
  );
}