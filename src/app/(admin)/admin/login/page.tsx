import Link from "next/link";

export const metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div>
      <h1>Admin Login</h1>
      <p>
        Admin has its own login, separate from the shared buyer/seller login,
        and every admin route lives under <code>/admin</code>.
      </p>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </div>
  );
}