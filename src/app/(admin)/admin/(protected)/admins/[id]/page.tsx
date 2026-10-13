import { AdminDetailClient } from "./admin-detail-client";

export const metadata = { title: "Admin Details" };

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDetailClient id={Number(id)} />;
}
