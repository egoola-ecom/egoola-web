"use client";

import Link from "next/link";
import type { ProductRow } from "@/lib/buyer/types";
import { useFavourites } from "@/lib/buyer/store/favourites";
import { resolveMediaUrl } from "@/lib/env";
import { SHOP } from "../shop-links";
import { taka } from "../money";

/** One product in a list: photo, seller, title, price (the old one struck
 * through while a discount runs) and an in-stock badge. */
export function ProductCard({ product }: { product: ProductRow }) {
  const { has, toggle } = useFavourites();
  const href = SHOP.product(product.id, product.slug);
  const liked = has(product.id);
  const discounted = Number(product.discounted_price) < Number(product.price);
  return (
    <div className="col-6 col-lg-3 single-product bg-white">
      <div className="service-tag">
        <Link href={href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="w-100"
            style={{ aspectRatio: "4 / 3", objectFit: "cover" }}
            src={resolveMediaUrl(product.image_url) ?? "/shop/images/no-img.jpg"}
            alt={product.title}
          />
        </Link>
        <div className="product-content">
          <div className="top pt-2">
            {product.seller && (
              <div className="user">
                <Link className="ml-2" href={SHOP.seller(product.seller.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveMediaUrl(product.seller.profile_pic_url) ?? "/shop/images/no-img.jpg"} alt={product.seller.name} />
                </Link>
                <Link className="ml-1 user-link" href={SHOP.seller(product.seller.id)}>
                  {product.seller.name}
                </Link>
              </div>
            )}
            <h6>
              <Link href={href} className="text-truncate d-block title title-responsive">
                {product.title}
              </Link>
            </h6>
            <div className="float-left">
              <span className={`badge ${product.in_stock ? "badge-success" : "badge-secondary"}`}>
                {product.in_stock ? "In stock" : "Sold out"}
              </span>
            </div>
            <div className="price text-right">
              {discounted && (
                <del className="text-muted mr-1" style={{ fontSize: "0.8em" }}>
                  {taka(product.price)}
                </del>
              )}
              <strong>BDT</strong> {taka(product.discounted_price)}
            </div>
          </div>
          <div className="bottom pt-1">
            <div className="d-inline">
              <a className="csp" onClick={() => toggle(product.id)} style={liked ? { color: "#2cd083" } : undefined}>
                <i className="fas fa-heart" /> Like
              </a>
            </div>
            <Link href={href}>
              <i className="fas fa-eye" /> View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
