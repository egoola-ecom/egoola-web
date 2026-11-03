import { MyJobsClient } from "./my-jobs-client";

export const metadata = { title: "My jobs" };

export default async function SellerMyJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ won?: string }>;
}) {
  const { won } = await searchParams;
  return <MyJobsClient initialWon={won === "true"} />;
}
