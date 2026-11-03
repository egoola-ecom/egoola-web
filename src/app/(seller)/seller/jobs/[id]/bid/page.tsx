import { notFound } from "next/navigation";
import { BidPlaceClient } from "./bid-place-client";

export const metadata = { title: "Place a bid" };

export default async function SellerPlaceBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BidPlaceClient jobId={Number(id)} />;
}
