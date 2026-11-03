"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getProduct } from "@/lib/buyer/public-products-api";
import type { ProductDetail as Product, ProductSku } from "@/lib/buyer/types";
import { useFavourites } from "@/lib/buyer/store/favourites";
import { SHOP, PRODUCT_TYPES } from "../shop-links";
import { taka } from "../money";
import { DetailMessage, useDetail } from "./use-detail";
import { Gallery } from "./gallery";
import { SellerBlock, placeText } from "./seller-block";
import { AddToCart } from "./add-to-cart";
import { CartStatus } from "./cart-status";

interface AttributeChoice {
  id: number;
  name: string;
  values: { id: number; name: string }[];
}

/** The option groups (size, colour, ...) found in the SKUs' `variants`. */
function attributeChoices(skus: ProductSku[]): AttributeChoice[] {
  const byId = new Map<number, AttributeChoice>();
  for (const sku of skus) {
    for (const v of sku.variants) {
      const group = byId.get(v.attribute.id) ?? { id: v.attribute.id, name: v.attribute.name, values: [] };
      if (!group.values.some((x) => x.id === v.attribute_value.id)) {
        group.values.push({ id: v.attribute_value.id, name: v.attribute_value.name });
      }
      byId.set(v.attribute.id, group);
    }
  }
  return [...byId.values()];
}

const valueOf = (sku: ProductSku, attributeId: number) =>
  sku.variants.find((v) => v.attribute.id === attributeId)?.attribute_value.id;

function stockText(sku: ProductSku): string {
  if (!sku.in_stock) return "Sold out";
  return sku.available_qty == null ? "In stock" : `${sku.available_qty} available`;
}

function Prices({ price, discounted }: { price: string; discounted: string }) {
  const off = Number(discounted) < Number(price);
  return (
    <span>
      {off && <del className="text-muted mr-2">{taka(price)}</del>}
      <strong className="text-success" style={{ fontSize: "1.5rem" }}>
        {taka(discounted)}
      </strong>
    </span>
  );
}

/** Option picker: each group lists its values; a value no SKU offers together
 * with the other picked values is greyed out. Once every group is picked the
 * matching SKU shows its own price and stock. */
function SkuPicker({ product }: { product: Product }) {
  const groups = useMemo(() => attributeChoices(product.skus), [product.skus]);
  const [picked, setPicked] = useState<Record<number, number>>({});

  const matches = (sku: ProductSku, selection: Record<number, number>) =>
    Object.entries(selection).every(([attr, value]) => valueOf(sku, Number(attr)) === value);

  const complete = groups.length > 0 && groups.every((g) => picked[g.id] != null);
  const sku = groups.length === 0 ? product.skus[0] : complete ? product.skus.find((s) => matches(s, picked)) : undefined;

  const cheapest = [...product.skus].sort((a, b) => Number(a.discounted_price) - Number(b.discounted_price))[0];

  return (
    <div>
      {groups.map((group) => (
        <div key={group.id} className="mb-3">
          <div className="font-weight-bold mb-1">{group.name}</div>
          {group.values.map((value) => {
            const others = { ...picked };
            delete others[group.id];
            const offered = product.skus.some((s) => valueOf(s, group.id) === value.id && matches(s, others));
            const on = picked[group.id] === value.id;
            return (
              <button
                key={value.id}
                type="button"
                disabled={!offered}
                aria-pressed={on}
                className={`btn btn-sm mr-2 mb-1 ${on ? "btn-success" : "btn-light border"}`}
                title={offered ? undefined : "Not available with the other choices"}
                onClick={() => setPicked((p) => (on ? Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== group.id)) : { ...p, [group.id]: value.id }))}
              >
                {value.name}
              </button>
            );
          })}
        </div>
      ))}

      {sku ? (
        <div>
          <Prices price={sku.price} discounted={sku.discounted_price} />
          <div className="mt-1">
            <span className={`badge ${sku.in_stock ? "badge-success" : "badge-secondary"}`}>{stockText(sku)}</span>
            <small className="text-muted ml-2">Code {sku.sku}</small>
          </div>
        </div>
      ) : complete ? (
        <p className="text-danger mb-0">This combination is not offered.</p>
      ) : cheapest ? (
        <div>
          <small className="text-muted">{groups.length > 0 ? "From " : ""}</small>
          <Prices price={cheapest.price} discounted={cheapest.discounted_price} />
          <p className="text-muted small mb-0 mt-1">Pick every option to see its price and stock.</p>
        </div>
      ) : null}

      <AddToCart
        key={sku?.id ?? "none"}
        kind="product"
        listingId={product.id}
        skuId={sku?.id ?? null}
        sellerId={product.seller?.id ?? null}
        maxQty={sku?.available_qty ?? null}
        startQty={product.min_order_qty ?? 1}
        blockedReason={
          sku
            ? sku.in_stock
              ? null
              : "This option is sold out."
            : complete
              ? "This combination is not offered."
              : "Pick every option to add it to your cart."
        }
      />
      <CartStatus type="product" sellerId={product.seller?.id ?? null} />

      {groups.length > 0 && (
        <details className="mt-3">
          <summary>All combinations ({product.skus.length})</summary>
          <table className="table table-sm mt-2">
            <thead>
              <tr>
                <th>Option</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {product.skus.map((s) => (
                <tr key={s.id}>
                  <td>{s.variants.map((v) => v.attribute_value.name).join(" / ") || s.sku}</td>
                  <td>{taka(s.discounted_price)}</td>
                  <td>{stockText(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function specRows(product: Product): [string, string][] {
  const rows: [string, string | null | undefined][] = [
    ["Model", product.model],
    ["Made in", product.origin],
    ["Warranty", product.warranty],
    ["Sold by the", product.measurement ? `${product.measurement.name} (${product.measurement.symbol})` : null],
    ["Minimum order", product.min_order_qty != null ? String(product.min_order_qty) : null],
    ["Condition", product.condition_note],
  ];
  if (product.attributes && typeof product.attributes === "object") {
    for (const [key, value] of Object.entries(product.attributes)) {
      rows.push([key, typeof value === "string" ? value : JSON.stringify(value)]);
    }
  }
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

export function ProductDetail({ id }: { id: number }) {
  const state = useDetail(() => getProduct(id), id);
  const { has, toggle } = useFavourites();
  if (state.status !== "ready") return <div className="container my-4"><DetailMessage state={state} what="Product" /></div>;
  const product = state.data;
  const specs = specRows(product);
  const shop = PRODUCT_TYPES.find((t) => t.listingType === product.listing_type);
  const place = placeText(product.location);
  const liked = has(product.id);

  return (
    <div className="container-fluid p-587 my-3">
      <nav className="small mb-2" aria-label="Breadcrumb">
        <Link href={SHOP.products}>Products</Link>
        {shop && (
          <>
            {" / "}
            <Link href={`${SHOP.products}/${shop.slug}`}>{shop.label}</Link>
          </>
        )}
        {" / "}
        <Link href={`${SHOP.products}?category=${product.category.id}&cname=${encodeURIComponent(product.category.name)}`}>
          {product.category.name}
        </Link>
      </nav>
      <div className="row bg-white p-3">
        <div className="col-lg-5 mb-3">
          <Gallery thumbnail={product.image_url} media={product.media} title={product.title} />
        </div>
        <div className="col-lg-7">
          <h3>{product.title}</h3>
          {product.title_bn && <p className="text-muted">{product.title_bn}</p>}
          <p>
            {shop && <span className="badge badge-light border mr-2">{shop.label}</span>}
            {product.brand && <span className="badge badge-light border mr-2">{product.brand.name}</span>}
            <span className="badge badge-light border">{product.category.name}</span>
          </p>
          <SkuPicker product={product} />
          <p className="mt-3">
            <a className="csp" onClick={() => toggle(product.id)} style={liked ? { color: "#2cd083" } : undefined}>
              <i className="fas fa-heart" /> {liked ? "Liked" : "Like"}
            </a>
          </p>
          <hr />
          <SellerBlock seller={product.seller} />
          {place && (
            <p className="mt-2 mb-0 text-muted">
              <i className="fas fa-map-marker-alt" /> {place}
            </p>
          )}
        </div>
      </div>

      {product.price_tiers.length > 0 && (
        <div className="bg-white p-3 mt-3">
          <h5>Buy more, pay less</h5>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Quantity</th>
                <th>Price each</th>
              </tr>
            </thead>
            <tbody>
              {product.price_tiers.map((tier) => (
                <tr key={tier.id}>
                  <td>
                    {tier.min_qty}
                    {tier.max_qty != null ? `–${tier.max_qty}` : " or more"}
                  </td>
                  <td>
                    {Number(tier.discounted_price) < Number(tier.price) && (
                      <del className="text-muted mr-2">{taka(tier.price)}</del>
                    )}
                    {taka(tier.discounted_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white p-3 mt-3">
        <h5>Description</h5>
        <p style={{ whiteSpace: "pre-line" }}>{product.description || "No description."}</p>
        {specs.length > 0 && (
          <table className="table table-sm mb-0">
            <tbody>
              {specs.map(([name, value]) => (
                <tr key={name}>
                  <th style={{ width: "30%" }}>{name}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
