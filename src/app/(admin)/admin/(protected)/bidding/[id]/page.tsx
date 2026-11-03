import { notFound } from "next/navigation";
import { BidDetailClient } from "./bid-detail-client";

export const metadata = { title: "Bid Details" };

export default async function BidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BidDetailClient id={Number(id)} />;
}
