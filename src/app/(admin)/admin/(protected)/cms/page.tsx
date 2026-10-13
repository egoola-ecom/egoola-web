import { CmsClient } from "./cms-client";
import { isCmsTabKey } from "./cms-tabs";

export const metadata = { title: "CMS" };

export default async function CmsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <CmsClient initialTab={isCmsTabKey(tab) ? tab : undefined} />;
}
