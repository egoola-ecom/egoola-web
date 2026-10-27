import { CartDetailClient } from "./cart-detail-client";

export const metadata = { title: "Cart Details" };

export default async function CartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CartDetailClient id={Number(id)} />;
}
