import { BuyerEditClient } from "./buyer-edit-client";

export const metadata = { title: "Update Buyer" };

export default async function BuyerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuyerEditClient id={Number(id)} />;
}
