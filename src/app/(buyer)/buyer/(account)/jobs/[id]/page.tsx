import { notFound } from "next/navigation";
import { JobDetailScreen } from "@/components/shop/jobs/job-detail-screen";

export const metadata = { title: "Job — Egoola.com" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <JobDetailScreen id={Number(id)} />;
}
