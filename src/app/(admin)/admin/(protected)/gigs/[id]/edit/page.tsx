import { GigEditClient } from "./gig-edit-client";

export const metadata = { title: "Update Gig" };

export default async function GigEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thumbnailError?: string }>;
}) {
  const { id } = await params;
  const { thumbnailError } = await searchParams;
  return <GigEditClient id={Number(id)} initialThumbnailError={thumbnailError ?? null} />;
}
