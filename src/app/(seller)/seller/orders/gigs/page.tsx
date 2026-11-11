import shell from "../../../seller-shell.module.css";

export const metadata = { title: "Gig orders" };

/** The server only lists product orders for a seller (`/seller/orders/`), so
 * there is nothing to load for gigs yet. This page keeps the menu entry and
 * says so, until the backend adds gig orders. */
export default function SellerGigOrdersPage() {
  return (
    <div>
      <h1 className={shell.pageTitle}>Gig orders</h1>
      <p className={shell.pageText}>
        Orders for your gigs are not available yet. Product orders are under Orders → Products.
      </p>
    </div>
  );
}
