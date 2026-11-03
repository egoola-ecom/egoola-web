import { notFound } from "next/navigation";
import { SellerJobDetailClient } from "./job-detail-client";

export const metadata = { title: "Job" };

export default async function SellerJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <SellerJobDetailClient id={Number(id)} />;
}
