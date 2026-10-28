import { BidDetailClient } from "./bid-detail-client";

export const metadata = { title: "Bid Details" };

export default async function BidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BidDetailClient id={Number(id)} />;
}
