import { OrdersClient } from "../orders-client";

export const metadata = { title: "Gig orders" };

export default function SellerGigOrdersPage() {
  return <OrdersClient type="service" />;
}
