import { JobCreateClient } from "./job-create-client";

export const metadata = { title: "Add Job" };

export default async function JobCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string }>;
}) {
  const { buyer } = await searchParams;
  const buyerId = Number(buyer);
  return <JobCreateClient buyerId={Number.isInteger(buyerId) && buyerId > 0 ? buyerId : null} />;
}
