"use client";

import { ActorTopbar } from "@/components/actor-topbar";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function BuyerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { session, checked } = useAuthGuard("buyer", "/login");

  if (!checked || !session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-muted)" }}>
        Checking session…
      </div>
    );
  }

  return (
    <div>
      <ActorTopbar session={session} actorType="buyer" loginPath="/login" />
      <main style={{ padding: "1.75rem" }}>{children}</main>
    </div>
  );
}
