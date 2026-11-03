"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CartSummary } from "@/lib/buyer/cart-api";
import { SHOP } from "../shop-links";
import { taka } from "../money";
import { cartUrl } from "./cart-status";

/** The header Cart entry: the total line count as a badge, and a dropdown with
 * one row per cart (newest first), each linking to that cart. */
export function CartMenu({ summary }: { summary: CartSummary | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLLIElement>(null);
  const count = summary?.item_count ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <li className="nav-item position-relative" ref={box}>
      <a className="nav-link menu-icon csp" role="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <i className="fas fa-shopping-cart" /> Cart
        {count > 0 && <span className="badge badge-success ml-1" data-testid="cart-badge">{count}</span>}
      </a>
      {open && (
        <div
          className="bg-white shadow border rounded p-2 text-left"
          style={{ position: "absolute", right: 0, top: "100%", minWidth: 280, zIndex: 1050 }}
          data-testid="cart-menu"
        >
          {!summary || summary.carts.length === 0 ? (
            <p className="text-muted small mb-2">You have no carts yet.</p>
          ) : (
            summary.carts.map((cart) => (
              <Link
                key={cart.id}
                href={cartUrl(cart.cart_type, cart.seller?.id ?? null)}
                className="d-flex justify-content-between border-bottom py-1 small"
                data-testid="cart-menu-row"
                onClick={() => setOpen(false)}
              >
                <span>
                  {cart.seller?.name ?? "Egoola"}
                  <span className="text-muted"> · {cart.cart_type === "product" ? "Products" : "Services"}</span>
                </span>
                <span className="text-nowrap ml-2">
                  {cart.item_count} {cart.item_count === 1 ? "item" : "items"} · {taka(cart.subtotal)}
                </span>
              </Link>
            ))
          )}
          <Link href={SHOP.cart} className="btn btn-success btn-sm btn-block mt-2" onClick={() => setOpen(false)}>
            View all carts
          </Link>
        </div>
      )}
    </li>
  );
}
