"use client";

import Link from "next/link";
import type { GigRow } from "@/lib/buyer/types";
import { useFavourites } from "@/lib/buyer/store/favourites";
import { resolveMediaUrl } from "@/lib/env";
import { SHOP } from "./shop-links";
import { OwlCarousel } from "./owl-carousel";
import { PRICE_UNIT, taka } from "./money";

/** One gig in a listing feed (the legacy `single-product` card). */
export function GigCard({ gig }: { gig: GigRow }) {
  const { has, toggle } = useFavourites();
  const href = SHOP.gig(gig.id, gig.slug);
  const liked = has(gig.id);
  return (
    <div className="col-6 col-lg-3 single-product bg-white">
      <div className="service-tag">
        <Link href={href}>
          <OwlCarousel className="prodict-img" showDots={false}>
            {[
              // eslint-disable-next-line @next/next/no-img-element
              <img key="i" src={resolveMediaUrl(gig.image_url) ?? "/shop/images/no-img.jpg"} alt={gig.title} />,
            ]}
          </OwlCarousel>
        </Link>
        <div className="product-content">
          <div className="top pt-2">
            <div className="user">
              <Link className="ml-2" href={SHOP.seller(gig.seller.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(gig.seller.profile_pic_url) ?? "/shop/images/no-img.jpg"} alt={gig.seller.name} />
              </Link>
              <Link className="ml-1 user-link" href={SHOP.seller(gig.seller.id)}>
                {gig.seller.name}
              </Link>
            </div>
            <h6>
              <Link href={href} className="text-truncate d-block title title-responsive">
                {gig.title}
              </Link>
            </h6>
            <div className="ratings float-left">
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className="fas fa-star" />
              ))}
              <span className="text-dark text-or">0</span> <span className="text-dark text-ddd">(0)</span>
            </div>
            <div className="price text-right">
              <small className="text-muted">from </small>
              <strong>BDT</strong> {taka(gig.discounted_price)}
              <small className="text-muted"> / {PRICE_UNIT[gig.price_type] ?? gig.price_type}</small>
            </div>
            {(gig.urgent || gig.delivery_days != null) && (
              <div className="mt-1" style={{ clear: "both" }}>
                {gig.urgent && <span className="badge badge-danger mr-1">Urgent</span>}
                {gig.delivery_days != null && (
                  <span className="badge badge-light border">
                    {gig.delivery_days} {gig.delivery_days === 1 ? "day" : "days"}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="bottom pt-1">
            <div className="d-inline">
              <a className="csp" onClick={() => toggle(gig.id)} style={liked ? { color: "#2cd083" } : undefined}>
                <i className="fas fa-heart" /> Like
              </a>
            </div>
            <Link href={`/buyer/hire/${gig.id}`}>
              <i className="fas fa-hand-holding-usd" /> Order
            </Link>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`/buyer/service/${gig.id}/${gig.slug}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <i className="fas fa-share-alt" /> Share
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
