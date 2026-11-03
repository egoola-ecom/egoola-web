import { notFound } from "next/navigation";
import { GigDetail } from "@/components/shop/browse/gig-detail";

export const metadata = { title: "Service — Egoola.com" };

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  return <GigDetail id={Number(id)} />;
}
