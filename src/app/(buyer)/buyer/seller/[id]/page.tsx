import { notFound } from "next/navigation";
import { SellerPage } from "@/components/shop/browse/seller-page";

export const metadata = { title: "Seller — Egoola.com" };

export default async function PublicSellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <SellerPage id={Number(id)} />;
}
