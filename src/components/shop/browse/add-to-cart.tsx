"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { addCartItem, type CartType } from "@/lib/buyer/cart-api";
import { cartErrorText } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { notifyCartChanged } from "@/lib/buyer/store/cart-badge";
import type { GigPriceType } from "@/lib/buyer/types";
import { PRICE_UNIT } from "../money";
import { cartUrl } from "./cart-status";

interface Props {
  kind: CartType;
  listingId: number;
  /** The resolved SKU (a product's picked combination, a gig's package). */
  skuId: number | null;
  sellerId: number | null;
  /** Why the button is off (nothing picked, sold out...). */
  blockedReason?: string | null;
  /** Product: the most that can be added right now, if stock is tracked. */
  maxQty?: number | null;
  /** Product: where the quantity box starts (the listing's minimum order). */
  startQty?: number;
  /** Gig: the unit `duration` is counted in. `fixed` needs no duration. */
  priceType?: GigPriceType | null;
}

/** Quantity (product) or duration (gig) plus the Add to cart button. The SKU
 * is always resolved before this can be pressed; the client checks only the
 * cheap things, and the server's 400 is the real answer. */
export function AddToCart({ kind, listingId, skuId, sellerId, blockedReason, maxQty, startQty = 1, priceType }: Props) {
  const router = useRouter();
  const needsAmount = kind === "product" || (priceType != null && priceType !== "fixed");
  const [amount, setAmount] = useState(String(Math.max(1, startQty)));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const number = Math.floor(Number(amount));
  const amountError = !needsAmount
    ? null
    : !Number.isFinite(number) || number < 1
      ? "Enter 1 or more."
      : kind === "product" && maxQty != null && number > maxQty
        ? `Only ${maxQty} available.`
        : null;

  async function add() {
    if (!getSession("buyer")) {
      router.push(loginUrlFor(window.location.pathname + window.location.search));
      return;
    }
    if (skuId == null || amountError) return;
    setBusy(true);
    setResult(null);
    try {
      await addCartItem(
        kind === "product"
          ? { listing: listingId, listing_sku: skuId, qty: number }
          : { listing: listingId, listing_sku: skuId, duration: needsAmount ? number : 1 },
      );
      setResult({ ok: true, text: "Added to your cart." });
      notifyCartChanged();
    } catch (err) {
      setResult({ ok: false, text: cartErrorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const unit = priceType ? (PRICE_UNIT[priceType] ?? priceType) : "";
  const off = Boolean(blockedReason) || skuId == null || Boolean(amountError) || busy;

  return (
    <div className="mt-3" data-testid="add-to-cart">
      <div className="d-flex align-items-center flex-wrap">
        {needsAmount && (
          <label className="mb-0 mr-3 d-flex align-items-center">
            <span className="mr-2">{kind === "product" ? "Quantity" : `How many ${unit}s`}</span>
            <input
              type="number"
              min={1}
              max={kind === "product" && maxQty != null ? maxQty : undefined}
              className="form-control form-control-sm"
              style={{ width: 90 }}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setResult(null);
              }}
              aria-label={kind === "product" ? "Quantity" : "Duration"}
            />
          </label>
        )}
        <button type="button" className="btn btn-success" disabled={off} onClick={add}>
          <i className="fas fa-shopping-cart" /> {busy ? "Adding…" : "Add to cart"}
        </button>
      </div>
      {blockedReason && <p className="text-muted small mb-0 mt-1">{blockedReason}</p>}
      {!blockedReason && amountError && <p className="text-danger small mb-0 mt-1">{amountError}</p>}
      {result && (
        <p className={`small mb-0 mt-1 ${result.ok ? "text-success" : "text-danger"}`} role="status">
          {result.text}{" "}
          {result.ok && <Link href={cartUrl(kind, sellerId)}>View cart</Link>}
        </p>
      )}
    </div>
  );
}
