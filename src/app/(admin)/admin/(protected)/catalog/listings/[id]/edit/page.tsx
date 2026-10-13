import { ListingEditClient } from "./listing-edit-client";

export const metadata = { title: "Update Listing" };

export default async function ListingEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thumbnailError?: string }>;
}) {
  const { id } = await params;
  const { thumbnailError } = await searchParams;
  return <ListingEditClient id={Number(id)} initialThumbnailError={thumbnailError ?? null} />;
}
