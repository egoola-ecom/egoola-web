"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import shell from "../seller-shell.module.css";
import { useSeller } from "./seller-context";

export default function SellerDashboardPage() {
  const router = useRouter();
  const { me } = useSeller();

  // A seller who cannot operate (verified AND active) only has the profile.
  useEffect(() => {
    if (!me.can_operate) router.replace("/seller/profile");
  }, [me.can_operate, router]);

  if (!me.can_operate) return <div className={shell.state}>Opening your profile…</div>;

  return (
    <div>
      <h1 className={shell.pageTitle}>Seller dashboard</h1>
      <p className={shell.pageText}>
        Your account is approved and active. You can add and manage your{" "}
        <Link href="/seller/listings">listings</Link> now. Freelance gigs, orders, wallet and
        withdrawals will appear here as they are built.
      </p>
    </div>
  );
}
