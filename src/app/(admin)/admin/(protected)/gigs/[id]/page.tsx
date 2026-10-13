import { GigDetailClient } from "./gig-detail-client";

export const metadata = { title: "Gig Details" };

export default async function GigDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  return <GigDetailClient id={Number(id)} fromRequests={from === "requests"} />;
}
