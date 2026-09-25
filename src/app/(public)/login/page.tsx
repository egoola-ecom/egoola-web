import Link from "next/link";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div>
      <h1>Login</h1>
      <p>
        Buyers and sellers share one login/registration flow with a role tab.
        This screen is scaffolded in Phase 0 and will be built out in Phase 1.
      </p>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </div>
  );
}