"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart, getCart, removeCartItem, updateCartItem, type Cart, type CartItem, type CartType, type SellerScope } from "@/lib/buyer/cart-api";
import { cartErrorText, isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { notifyCartChanged, useCartSummary } from "@/lib/buyer/store/cart-badge";
import { resolveMediaUrl } from "@/lib/env";
import { SHOP } from "../shop-links";
import { PRICE_UNIT, taka } from "../money";
import { useQueryParams } from "./use-query-params";
import { cartUrl } from "./cart-status";

function sellerScope(raw: string): SellerScope {
  return /^\d+$/.test(raw) ? Number(raw) : "recent";
}

/** One cart at a time, with the list of every cart above it. The type tab and
 * (optionally) a seller come from the URL; with neither, it opens the cart the
 * buyer touched most recently, of any type. */
export function CartScreen() {
  const router = useRouter();
  const { get, update } = useQueryParams();
  const summary = useCartSummary();
  const typeParam = get("type");
  const lead = !typeParam ? summary?.carts[0] : undefined;
  const type: CartType = typeParam ? (typeParam === "service" ? "service" : "product") : (lead?.cart_type ?? "product");
  const seller: SellerScope = typeParam ? sellerScope(get("seller")) : lead ? (lead.seller?.id ?? 0) : "recent";
  // With no type in the URL, wait for the summary to say which cart to open.
  const ready = Boolean(typeParam) || summary !== null;

  // undefined = still loading, null = the buyer has no such cart.
  const [cart, setCart] = useState<Cart | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = useCallback(
    (err: unknown) => {
      if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname + window.location.search));
      else setMessage(cartErrorText(err));
    },
    [router],
  );

  const load = useCallback(() => {
    return getCart(type, seller)
      .then((next) => {
        setCart(next);
        setFailed(false);
      })
      .catch((err) => {
        if (isSignedOut(err)) fail(err);
        else setFailed(true);
      });
  }, [type, seller, fail]);

  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(undefined);
    setMessage(null);
    void load();
  }, [load, ready]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await load();
      notifyCartChanged();
    } catch (err) {
      fail(err);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const change = (item: CartItem, value: number) => {
    if (!Number.isFinite(value) || value < 1) return;
    void run(() => updateCartItem(item.id, item.listing.catalog_type === "product" ? { qty: value } : { duration: value }));
  };

  const tab = (value: CartType, label: string) => (
    <li className="nav-item">
      <button
        type="button"
        className={`nav-link ${type === value ? "active" : ""}`}
        onClick={() => update({ type: value, seller: undefined })}
      >
        {label}
      </button>
    </li>
  );

  return (
    <div className="container-fluid p-587 my-3">
      <h4 className="mb-3">My cart</h4>
      <ul className="nav nav-tabs mb-3" role="tablist">
        {tab("product", "Products")}
        {tab("service", "Services")}
      </ul>
      <p className="text-muted small">
        Each seller has a separate cart, and products and services never share one.
      </p>

      {summary && summary.carts.length > 0 && (
        <div className="bg-white p-2 mb-3" data-testid="cart-list">
          <div className="small text-muted mb-1">
            Your carts: {summary.carts.length} ({summary.item_count} {summary.item_count === 1 ? "item" : "items"} in all)
          </div>
          {summary.carts.map((row) => {
            const rowSeller = row.seller?.id ?? 0;
            const current = cart ? cart.id === row.id : row.cart_type === type && (seller === "recent" || seller === rowSeller);
            return (
              <Link
                key={row.id}
                href={cartUrl(row.cart_type, row.seller?.id ?? null)}
                className={`d-flex justify-content-between py-1 px-2 small ${current ? "bg-light font-weight-bold" : ""}`}
                data-testid="cart-list-row"
                aria-current={current ? "true" : undefined}
              >
                <span>
                  {row.seller?.name ?? "Egoola"}
                  <span className="text-muted"> · {row.cart_type === "product" ? "Products" : "Services"}</span>
                </span>
                <span>
                  {row.item_count} {row.item_count === 1 ? "item" : "items"} · {taka(row.subtotal)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {message && (
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
      )}

      {failed ? (
        <p className="text-danger text-center py-5">We couldn&apos;t load your cart. Please try again.</p>
      ) : cart === undefined ? (
        <p className="text-muted text-center py-5">Loading…</p>
      ) : cart === null ? (
        <div className="bg-white text-center p-5" data-testid="cart-none">
          <h5>You have no {type === "product" ? "product" : "service"} cart yet</h5>
          <p className="text-muted">Add something and it will show up here.</p>
          <Link className="btn btn-success" href={type === "product" ? SHOP.products : SHOP.services}>
            Browse {type === "product" ? "products" : "services"}
          </Link>
        </div>
      ) : (
        <div className="bg-white p-3">
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
            <div>
              {cart.seller ? (
                <>
                  Seller: <Link href={SHOP.seller(cart.seller.id)}>{cart.seller.name}</Link>
                </>
              ) : (
                "Sold by Egoola"
              )}
            </div>
            {cart.items.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Remove every item from this cart?")) void run(() => clearCart(type, cart.seller?.id ?? 0));
                }}
              >
                Clear cart
              </button>
            )}
          </div>

          {cart.items.length === 0 ? (
            <div className="text-center p-4" data-testid="cart-empty">
              <h5>This cart is empty</h5>
              <Link href={cart.seller ? SHOP.seller(cart.seller.id) : type === "product" ? SHOP.products : SHOP.services}>
                Keep shopping
              </Link>
            </div>
          ) : (
            <>
              {cart.items.map((item) => (
                <CartLine key={item.id} item={item} busy={busy} onChange={change} onRemove={() => run(() => removeCartItem(item.id))} />
              ))}
              <div className="text-right mt-3">
                <span className="text-muted mr-2">Subtotal</span>
                <strong style={{ fontSize: "1.3rem" }} data-testid="cart-subtotal">
                  {taka(cart.subtotal)}
                </strong>
                <p className="text-muted small mb-0">Delivery and any discount are added when you check out.</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CartLine({
  item,
  busy,
  onChange,
  onRemove,
}: {
  item: CartItem;
  busy: boolean;
  onChange: (item: CartItem, value: number) => void;
  onRemove: () => void;
}) {
  const product = item.listing.catalog_type === "product";
  const amount = (product ? item.qty : item.duration) ?? 1;
  const unit = item.listing_sku.price_type ?? null;
  const href = product ? SHOP.product(item.listing.id, item.listing.slug) : SHOP.gig(item.listing.id, item.listing.slug);
  const [draft, setDraft] = useState(String(amount));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(String(amount));
  }, [amount]);
  const fixed = !product && unit === "fixed";
  const options = [item.color, item.size].filter(Boolean).join(" / ");

  return (
    <div
      className="row align-items-center border-bottom py-2"
      data-testid="cart-line"
      data-available={item.available}
      style={item.available ? undefined : { opacity: 0.75, background: "#fff8f8" }}
    >
      <div className="col-3 col-md-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w-100" src={resolveMediaUrl(item.listing.image_url) ?? "/shop/images/no-img.jpg"} alt="" />
      </div>
      <div className="col-9 col-md-5">
        <Link href={href} style={item.available ? undefined : { textDecoration: "line-through" }}>
          {item.listing.title}
        </Link>
        {options && <div className="small text-muted">{options}</div>}
        {item.listing_sku.sku && <div className="small text-muted">Code {item.listing_sku.sku}</div>}
        {!item.available && (
          <div className="small text-danger" role="alert">
            <i className="fas fa-exclamation-triangle" /> No longer available as added (out of stock or off sale). It stays here until you remove it.
          </div>
        )}
      </div>
      <div className="col-6 col-md-3 mt-2 mt-md-0">
        {fixed ? (
          <span className="text-muted">Fixed price</span>
        ) : (
          <div className="d-flex align-items-center">
            <button type="button" className="btn btn-sm btn-light border" aria-label="Decrease" disabled={busy || amount <= 1} onClick={() => onChange(item, amount - 1)}>
              −
            </button>
            <input
              type="number"
              min={1}
              className="form-control form-control-sm mx-1"
              style={{ width: 70 }}
              aria-label={product ? "Quantity" : "Duration"}
              value={draft}
              disabled={busy}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                const next = Math.floor(Number(draft));
                if (next !== amount) onChange(item, next);
                else setDraft(String(amount));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <button type="button" className="btn btn-sm btn-light border" aria-label="Increase" disabled={busy} onClick={() => onChange(item, amount + 1)}>
              +
            </button>
            {unit && <small className="text-muted ml-2">{PRICE_UNIT[unit] ?? unit}s</small>}
          </div>
        )}
      </div>
      <div className="col-4 col-md-2 text-right mt-2 mt-md-0">
        <div className="small text-muted">{item.unit_price != null ? `${taka(item.unit_price)} each` : "No price"}</div>
        <strong>{item.line_subtotal != null ? taka(item.line_subtotal) : "—"}</strong>
      </div>
      <div className="col-2 col-md-1 text-right mt-2 mt-md-0">
        <button type="button" className="btn btn-sm btn-link text-danger" aria-label={`Remove ${item.listing.title}`} disabled={busy} onClick={onRemove}>
          <i className="fas fa-trash" />
        </button>
      </div>
    </div>
  );
}
