import { notFound } from "next/navigation";
import { MyBidEditClient } from "./bid-edit-client";

export const metadata = { title: "Edit bid" };

export default async function SellerBidEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <MyBidEditClient id={Number(id)} />;
}
