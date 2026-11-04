import { notFound } from "next/navigation";
import { OrderDetailClient } from "./order-detail-client";

export const metadata = { title: "Order" };

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <OrderDetailClient id={Number(id)} />;
}
