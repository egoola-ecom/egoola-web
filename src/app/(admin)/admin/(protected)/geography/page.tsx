import { GeographyClient, type GeographyTabKey } from "./geography-client";

export const metadata = { title: "Geography" };

const TABS: GeographyTabKey[] = ["countries", "states", "cities", "thanas"];

export default async function GeographyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <GeographyClient initialTab={TABS.find((key) => key === tab)} />;
}
