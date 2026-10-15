import { GigEditClient } from "./gig-edit-client";

export const metadata = { title: "Edit gig" };

export default async function SellerGigEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filesError?: string }>;
}) {
  const { id } = await params;
  const { filesError } = await searchParams;
  return (
    <GigEditClient
      id={Number(id)}
      initialFilesError={filesError ?? null}
    />
  );
}
