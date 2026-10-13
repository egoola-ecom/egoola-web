import { AdminEditClient } from "./admin-edit-client";

export const metadata = { title: "Update Admin" };

export default async function AdminEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminEditClient id={Number(id)} />;
}
