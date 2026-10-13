import { ListingDetailClient } from "./listing-detail-client";

export const metadata = { title: "Listing" };

export default async function SellerListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  return <ListingDetailClient id={Number(id)} notice={notice ?? null} />;
}
