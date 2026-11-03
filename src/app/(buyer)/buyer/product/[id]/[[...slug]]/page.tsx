import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/shop/browse/product-detail";

export const metadata = { title: "Product — Egoola.com" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <ProductDetail id={Number(id)} />;
}
