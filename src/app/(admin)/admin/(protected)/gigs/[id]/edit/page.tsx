import { GigEditClient } from "./gig-edit-client";

export const metadata = { title: "Update Gig" };

export default async function GigEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filesError?: string }>;
}) {
  const { id } = await params;
  const { filesError } = await searchParams;
  return <GigEditClient id={Number(id)} initialFilesError={filesError ?? null} />;
}
