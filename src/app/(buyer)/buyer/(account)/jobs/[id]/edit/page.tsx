import { notFound } from "next/navigation";
import { JobForm } from "@/components/shop/jobs/job-form";

export const metadata = { title: "Edit job — Egoola.com" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <JobForm jobId={Number(id)} />;
}
