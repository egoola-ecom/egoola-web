import { notFound } from "next/navigation";
import { BidEditClient } from "./bid-edit-client";

export const metadata = { title: "Update Bid" };

export default async function BidEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BidEditClient id={Number(id)} />;
}
