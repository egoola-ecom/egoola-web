import { notFound } from "next/navigation";
import { OrderDetailScreen } from "@/components/shop/orders/order-detail-screen";

export const metadata = { title: "Order — Egoola.com" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <OrderDetailScreen id={Number(id)} />;
}
