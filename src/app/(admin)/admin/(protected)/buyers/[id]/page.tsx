import { BuyerDetailClient } from "./buyer-detail-client";

export const metadata = { title: "Buyer Details" };

export default async function BuyerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuyerDetailClient id={Number(id)} />;
}
