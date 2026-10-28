import { JobsClient } from "./jobs-client";

export const metadata = { title: "Jobs" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; status?: string }>;
}) {
  const { buyer, status } = await searchParams;
  return <JobsClient buyer={buyer} initialStatus={status} />;
}
