import { WishlistDetailClient } from "./wishlist-detail-client";

export const metadata = { title: "Wishlist Item" };

export default async function WishlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WishlistDetailClient id={Number(id)} />;
}
