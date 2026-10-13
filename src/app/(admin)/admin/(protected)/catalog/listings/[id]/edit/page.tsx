import { ListingEditClient } from "./listing-edit-client";

export const metadata = { title: "Update Listing" };

export default async function ListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingEditClient id={Number(id)} />;
}
