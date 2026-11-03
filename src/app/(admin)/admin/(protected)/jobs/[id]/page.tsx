import { notFound } from "next/navigation";
import { JobDetailClient } from "./job-detail-client";

export const metadata = { title: "Job Details" };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <JobDetailClient id={Number(id)} />;
}
