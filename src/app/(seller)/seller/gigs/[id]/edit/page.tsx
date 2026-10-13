import { GigEditClient } from "./gig-edit-client";

export const metadata = { title: "Edit gig" };

export default async function SellerGigEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mediaError?: string; thumbnailError?: string }>;
}) {
  const { id } = await params;
  const { mediaError, thumbnailError } = await searchParams;
  return (
    <GigEditClient
      id={Number(id)}
      initialMediaError={mediaError ?? null}
      initialThumbnailError={thumbnailError ?? null}
    />
  );
}
