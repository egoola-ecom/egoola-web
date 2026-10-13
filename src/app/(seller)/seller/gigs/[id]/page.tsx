import { GigDetailClient } from "./gig-detail-client";

export const metadata = { title: "Gig" };

export default async function SellerGigDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  return <GigDetailClient id={Number(id)} notice={notice ?? null} />;
}
