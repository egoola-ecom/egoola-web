import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrowseScreen } from "@/components/shop/browse/browse-screen";
import { PRODUCT_TYPES } from "@/components/shop/shop-links";

export const metadata = { title: "Products — Egoola.com" };

/** `/buyer/products/used-mall` and the other four shops: the product list with
 * the shop (`listing_type`) fixed. */
export default async function ProductShopPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const shop = PRODUCT_TYPES.find((t) => t.slug === type);
  if (!shop) notFound();
  return (
    <Suspense fallback={<p className="text-center py-5">Loading…</p>}>
      <BrowseScreen kind="product" presetType={shop.listingType} />
    </Suspense>
  );
}
