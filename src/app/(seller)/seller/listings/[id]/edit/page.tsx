import { ListingEditClient } from "./listing-edit-client";

export const metadata = { title: "Edit listing" };

export default async function SellerListingEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mediaError?: string }>;
}) {
  const { id } = await params;
  const { mediaError } = await searchParams;
  return <ListingEditClient id={Number(id)} initialMediaError={mediaError ?? null} />;
}
