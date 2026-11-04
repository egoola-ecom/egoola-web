import { OrdersClient } from "./orders-client";

export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; seller?: string }>;
}) {
  const { buyer, seller } = await searchParams;
  return (
    <OrdersClient
      buyer={buyer && /^\d+$/.test(buyer) ? buyer : undefined}
      seller={seller && /^\d+$/.test(seller) ? seller : undefined}
    />
  );
}
