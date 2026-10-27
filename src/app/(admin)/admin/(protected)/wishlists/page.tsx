import { WishlistsClient } from "./wishlists-client";

export const metadata = { title: "Wishlists" };

export default async function WishlistsPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; listing?: string }>;
}) {
  const { buyer, listing } = await searchParams;
  return <WishlistsClient buyer={buyer} listing={listing} />;
}
