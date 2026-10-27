import { CartsClient } from "./carts-client";

export const metadata = { title: "Carts" };

export default async function CartsPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; listing?: string }>;
}) {
  const { buyer, listing } = await searchParams;
  return <CartsClient buyer={buyer} listing={listing} />;
}
