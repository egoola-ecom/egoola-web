import { SellerDetailClient } from "./seller-detail-client";

export const metadata = { title: "Seller Details" };

export default async function SellerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  return <SellerDetailClient id={Number(id)} from={from} />;
}
