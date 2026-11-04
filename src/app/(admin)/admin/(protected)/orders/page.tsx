import { ALL_ORDER_STATUSES } from "@/components/order-status";
import { OrdersClient } from "./orders-client";

export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ buyer?: string; seller?: string; status?: string }>;
}) {
  const { buyer, seller, status } = await searchParams;
  return (
    <OrdersClient
      buyer={buyer && /^\d+$/.test(buyer) ? buyer : undefined}
      seller={seller && /^\d+$/.test(seller) ? seller : undefined}
      status={ALL_ORDER_STATUSES.find((value) => value === status)}
    />
  );
}
