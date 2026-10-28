import { JobEditClient } from "./job-edit-client";

export const metadata = { title: "Update Job" };

export default async function JobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobEditClient id={Number(id)} />;
}
