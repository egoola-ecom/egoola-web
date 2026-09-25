import Link from "next/link";

export const metadata = { title: "Buyer Dashboard" };

export default function BuyerDashboardPage() {
  return (
    <div>
      <h1>Buyer Dashboard</h1>
      <p>
        Buyer-only pages live under the <code>/buyer</code> route group: orders,
        cart, checkout, messaging, reviews, and profile.
      </p>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </div>
  );
}