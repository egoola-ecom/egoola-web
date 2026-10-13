import { ListingDetailClient } from "./listing-detail-client";

export const metadata = { title: "Listing Details" };

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  return <ListingDetailClient id={Number(id)} fromRequests={from === "requests"} />;
}
