import { notFound } from "next/navigation";
import { MyBidDetailClient } from "./bid-detail-client";

export const metadata = { title: "Bid" };

export default async function SellerBidDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  return <MyBidDetailClient id={Number(id)} notice={notice ?? null} />;
}
