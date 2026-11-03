import { Suspense } from "react";
import { BrowseScreen } from "@/components/shop/browse/browse-screen";

export const metadata = { title: "Products — Egoola.com" };

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="text-center py-5">Loading…</p>}>
      <BrowseScreen kind="product" />
    </Suspense>
  );
}
