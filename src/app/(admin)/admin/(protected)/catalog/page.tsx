import { redirect } from "next/navigation";
import { CatalogClient } from "./catalog-client";
import { isCatalogTabKey } from "./catalog-tabs";
import { LISTING_STATUS_OPTIONS } from "./listings/listing-utils";

export const metadata = { title: "Catalog" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { tab, status } = await searchParams;
  // Old links (the dashboard's, bookmarks) pointed at a Listings tab.
  if (tab === "listings") {
    const listingStatus = LISTING_STATUS_OPTIONS.find((opt) => opt.value === status)?.value;
    redirect(listingStatus ? `/admin/catalog/listings?status=${listingStatus}` : "/admin/catalog/listings");
  }
  return <CatalogClient initialTab={isCatalogTabKey(tab) ? tab : undefined} />;
}
