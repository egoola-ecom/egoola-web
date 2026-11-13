import { OrdersClient } from "./orders-client";

export const metadata = { title: "Product orders" };

export default function SellerOrdersPage() {
  return <OrdersClient type="product" />;
}
