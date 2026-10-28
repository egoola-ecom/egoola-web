import { JobDetailClient } from "./job-detail-client";

export const metadata = { title: "Job Details" };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailClient id={Number(id)} />;
}
