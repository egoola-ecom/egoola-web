import { ListingEditClient } from "./listing-edit-client";

export const metadata = { title: "Update Listing" };

export default async function ListingEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filesError?: string }>;
}) {
  const { id } = await params;
  const { filesError } = await searchParams;
  return <ListingEditClient id={Number(id)} initialFilesError={filesError ?? null} />;
}
