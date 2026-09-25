import Link from "next/link";

export const metadata = { title: "Seller Dashboard" };

export default function SellerDashboardPage() {
  return (
    <div>
      <h1>Seller Dashboard</h1>
      <p>
        Seller-only pages live under the <code>/seller</code> route group:
        KYC/onboarding, profile, listings, freelance gigs, orders, wallet, and
        withdrawals.
      </p>
      <p>
        <Link href="/">Back home</Link>
      </p>
    </div>
  );
}