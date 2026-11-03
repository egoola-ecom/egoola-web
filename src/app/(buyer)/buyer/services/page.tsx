import { Suspense } from "react";
import { BrowseScreen } from "@/components/shop/browse/browse-screen";

export const metadata = { title: "Services — Egoola.com" };

export default function ServicesPage() {
  return (
    <Suspense fallback={<p className="text-center py-5">Loading…</p>}>
      <BrowseScreen kind="gig" />
    </Suspense>
  );
}
