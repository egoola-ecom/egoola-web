import { SellerEditClient } from "./seller-edit-client";

export const metadata = { title: "Update Seller" };

export default async function SellerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerEditClient id={Number(id)} />;
}
