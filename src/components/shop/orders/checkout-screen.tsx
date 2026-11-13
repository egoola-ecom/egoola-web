"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAddresses, placeText, type BuyerAddress } from "@/lib/buyer/buyer-addresses-api";
import { checkout, listPublicGateways, orderProblem, type PublicGateway } from "@/lib/buyer/buyer-orders-api";
import { getCart, type Cart, type CartType } from "@/lib/buyer/cart-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { notifyCartChanged } from "@/lib/buyer/store/cart-badge";
import { AddressForm } from "../addresses/address-form";
import { useQueryParams } from "../browse/use-query-params";
import { cartUrl } from "../browse/cart-status";
import { durationText, taka } from "../money";
import { SHOP } from "../shop-links";

interface Loaded {
  cart: Cart | null;
  addresses: BuyerAddress[];
  gateways: PublicGateway[];
}

/** Checkout for one cart (`?type=&seller=`): pick a saved address (or add one),
 * see the payment method, confirm. The server decides whether the cart can be
 * checked out; its message is shown as it is. */
export function CheckoutScreen() {
  const router = useRouter();
  const { get } = useQueryParams();
  const type: CartType = get("type") === "service" ? "service" : "product";
  const sellerParam = get("seller");
  const seller = /^\d+$/.test(sellerParam) ? Number(sellerParam) : 0;

  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [gatewayId, setGatewayId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ fields: Record<string, string>; general: string | null } | null>(null);

  const signOut = useCallback(() => router.replace(loginUrlFor(window.location.pathname + window.location.search)), [router]);

  const load = useCallback(
    async (pick?: number) => {
      try {
        const [cart, addresses, gateways] = await Promise.all([getCart(type, seller), listAddresses(), listPublicGateways()]);
        setData({ cart, addresses, gateways });
        setFailed(false);
        setAddressId((current) => pick ?? (addresses.some((a) => a.id === current) ? current : (addresses[0]?.id ?? null)));
        setGatewayId((current) => (gateways.some((g) => g.id === current) ? current : (gateways[0]?.id ?? null)));
        if (addresses.length === 0) setAdding(true);
      } catch (err) {
        if (isSignedOut(err)) signOut();
        else setFailed(true);
      }
    },
    [type, seller, signOut],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function confirm() {
    if (busy || !data?.cart || addressId === null || gatewayId === null) return;
    setBusy(true);
    setProblem(null);
    try {
      const order = await checkout({ cart: data.cart.id, address: addressId, payment_gateway: gatewayId });
      notifyCartChanged();
      router.push(SHOP.order(order.id));
    } catch (err) {
      if (isSignedOut(err)) signOut();
      else setProblem(orderProblem(err));
      setBusy(false);
    }
  }

  if (failed) return <p className="text-danger text-center py-5">We couldn&apos;t load checkout. Please try again.</p>;
  if (!data) return <p className="text-muted text-center py-5">Loading…</p>;

  const { cart, addresses, gateways } = data;
  const backToCart = cartUrl(type, seller || null);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-fluid p-587 my-3">
        <div className="bg-white text-center p-5" data-testid="checkout-no-cart">
          <h5>There is nothing to check out here</h5>
          <p className="text-muted">This cart is empty, or it was already checked out.</p>
          <Link className="btn btn-success mr-2" href={SHOP.orders}>
            My orders
          </Link>
          <Link className="btn btn-light border" href={SHOP.cart}>
            My cart
          </Link>
        </div>
      </div>
    );
  }

  const stale = cart.items.filter((i) => !i.available);
  const ready = addressId !== null && gatewayId !== null && stale.length === 0 && cart.items.length > 0;

  return (
    <div className="container-fluid p-587 my-3">
      <p className="small mb-2">
        <Link href={backToCart}>← Back to cart</Link>
      </p>
      <h4 className="mb-3">Checkout</h4>

      <div className="row">
        <div className="col-lg-8">
          <div className="bg-white border p-3 mb-3" data-testid="checkout-address">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Delivery address</h6>
              {!adding && addresses.length > 0 && (
                <button type="button" className="btn btn-sm btn-light border" data-testid="new-address" onClick={() => setAdding(true)}>
                  Add a new address
                </button>
              )}
            </div>

            {addresses.length === 0 && (
              <p className="text-muted" data-testid="checkout-need-address">
                You have no saved address yet. Add one to continue.
              </p>
            )}

            {addresses.map((a) => (
              <label
                key={a.id}
                className={`d-block border rounded p-2 mb-2 ${addressId === a.id ? "border-success" : ""}`}
                data-testid="checkout-address-option"
              >
                <input type="radio" name="address" className="mr-2" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <strong>{a.name}</strong> · {a.phone}
                <div className="small ml-4">
                  {a.address_line1}
                  {a.address_line2 ? `, ${a.address_line2}` : ""}
                </div>
                <div className="small text-muted ml-4">
                  {placeText(a)}
                  {a.zip ? ` — ${a.zip}` : ""}
                </div>
              </label>
            ))}
            {problem?.fields.address && (
              <p className="text-danger small" role="alert">
                {problem.fields.address}
              </p>
            )}

            {adding && (
              <div className="mt-2">
                <AddressForm
                  onCancel={() => setAdding(false)}
                  onSaved={(saved) => {
                    setAdding(false);
                    void load(saved.id);
                  }}
                />
              </div>
            )}
          </div>

          <div className="bg-white border p-3 mb-3" data-testid="checkout-payment">
            <h6>Payment</h6>
            {gateways.length === 0 ? (
              <p className="text-danger mb-0" role="alert">
                No payment method is available right now. Please try again later.
              </p>
            ) : gateways.length === 1 ? (
              <p className="mb-0" data-testid="checkout-gateway">
                {gateways[0].name}
                {gateways[0].slug === "cash-on-delivery" && <span className="text-muted small"> — pay when it arrives</span>}
              </p>
            ) : (
              gateways.map((g) => (
                <label key={g.id} className="d-block mb-1">
                  <input type="radio" name="gateway" className="mr-2" checked={gatewayId === g.id} onChange={() => setGatewayId(g.id)} />
                  {g.name}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="bg-white border p-3 mb-3" data-testid="checkout-summary">
            <h6>Summary</h6>
            <p className="small text-muted mb-2">{cart.seller ? `Seller: ${cart.seller.name}` : "Sold by Egoola"}</p>
            {cart.items.map((item) => (
              <div key={item.id} className="d-flex justify-content-between small mb-1">
                <span>
                  {item.listing.title} ×{" "}
                  {item.qty != null ? item.qty : durationText(item.duration ?? 1, item.listing_sku.price_type)}
                </span>
                <span>{item.line_subtotal != null ? taka(item.line_subtotal) : "—"}</span>
              </div>
            ))}
            <hr />
            <div className="d-flex justify-content-between">
              <span>Subtotal</span>
              <strong data-testid="checkout-subtotal">{taka(cart.subtotal)}</strong>
            </div>
            <p className="small text-muted mb-3">Delivery and any discount are worked out when you confirm.</p>

            {stale.length > 0 && (
              <p className="small text-danger" role="alert" data-testid="checkout-stale">
                {stale.length === 1 ? "One item is" : `${stale.length} items are`} no longer available. Remove {stale.length === 1 ? "it" : "them"} from
                your cart first.
              </p>
            )}
            {problem?.general && (
              <p className="alert alert-danger small" role="alert" data-testid="checkout-error">
                {problem.general}
              </p>
            )}
            {problem && !problem.general && Object.keys(problem.fields).length > 0 && (
              <p className="alert alert-danger small" role="alert" data-testid="checkout-error">
                {Object.entries(problem.fields)
                  .filter(([key]) => key !== "address")
                  .map(([, message]) => message)
                  .join(" ") || "Please check your address and try again."}
              </p>
            )}
            <button type="button" className="btn btn-success btn-block" disabled={!ready || busy} data-testid="confirm-order" onClick={() => void confirm()}>
              {busy ? "Placing order…" : "Confirm order"}
            </button>
            {addressId === null && <p className="small text-muted mt-2 mb-0">Choose or add an address to continue.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
