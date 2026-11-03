"use client";

import { useState } from "react";
import { useFavourites } from "@/lib/buyer/store/favourites";
import Link from "next/link";
import { getGig } from "@/lib/buyer/public-gigs-api";
import { SHOP } from "../shop-links";
import { PRICE_UNIT, taka } from "../money";
import { DetailMessage, useDetail } from "./use-detail";
import { Gallery } from "./gallery";
import { SellerBlock, placeText } from "./seller-block";
import { AddToCart } from "./add-to-cart";
import { CartStatus } from "./cart-status";

const RATE_LABEL: Record<string, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  fixed: "Fixed price",
};

function dateText(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "";
}

export function GigDetail({ id }: { id: number }) {
  const state = useDetail(() => getGig(id), id);
  const { has, toggle } = useFavourites();
  const [pickedId, setPickedId] = useState<number | null>(null);
  if (state.status !== "ready") return <div className="container my-4"><DetailMessage state={state} what="Service" /></div>;
  const gig = state.data;
  const place = placeText(gig.location);
  const from = dateText(gig.available_from);
  const to = dateText(gig.available_to);
  const byPrice = [...gig.packages].sort((a, b) => Number(a.discounted_price) - Number(b.discounted_price));
  const picked = gig.packages.find((p) => p.id === pickedId) ?? byPrice[0] ?? null;

  return (
    <div className="container-fluid p-587 my-3">
      <nav className="small mb-2" aria-label="Breadcrumb">
        <Link href={SHOP.services}>Services</Link>
        {" / "}
        <Link href={`${SHOP.services}?category=${gig.category.id}&cname=${encodeURIComponent(gig.category.name)}`}>
          {gig.category.name}
        </Link>
      </nav>
      <div className="row bg-white p-3">
        <div className="col-lg-5 mb-3">
          <Gallery thumbnail={gig.image_url} media={gig.media} title={gig.title} />
        </div>
        <div className="col-lg-7">
          <h3>{gig.title}</h3>
          {gig.title_bn && <p className="text-muted">{gig.title_bn}</p>}
          <p>
            {gig.urgent && <span className="badge badge-danger mr-2">Urgent</span>}
            {gig.delivery_days != null && (
              <span className="badge badge-light border mr-2">
                Delivered in {gig.delivery_days} {gig.delivery_days === 1 ? "day" : "days"}
              </span>
            )}
            <span className="badge badge-light border">{gig.category.name}</span>
          </p>
          <div className="mb-3">
            <small className="text-muted">From </small>
            <strong className="text-success" style={{ fontSize: "1.5rem" }}>
              {taka(gig.discounted_price)}
            </strong>
            <small className="text-muted"> / {PRICE_UNIT[gig.price_type] ?? gig.price_type}</small>
          </div>
          {(from || to) && (
            <p className="mb-1">
              <strong>Available:</strong> {from || "now"} {to ? `to ${to}` : "onwards"}
            </p>
          )}
          {place && (
            <p className="text-muted">
              <i className="fas fa-map-marker-alt" /> {place}
            </p>
          )}
          <p>
            <a className="csp" onClick={() => toggle(gig.id)} style={has(gig.id) ? { color: "#2cd083" } : undefined}>
              <i className="fas fa-heart" /> {has(gig.id) ? "Liked" : "Like"}
            </a>
          </p>
          <hr />
          <SellerBlock seller={gig.seller} />
        </div>
      </div>

      <div className="bg-white p-3 mt-3">
        <h5>Packages</h5>
        <p className="text-muted small">Every rate this seller offers, so you can compare.</p>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th />
                <th>Rate</th>
                <th>Price</th>
                <th>What you get</th>
              </tr>
            </thead>
            <tbody>
              {byPrice.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>
                      <input
                        type="radio"
                        name="package"
                        aria-label={`Choose the ${RATE_LABEL[pkg.price_type] ?? pkg.price_type} rate`}
                        checked={picked?.id === pkg.id}
                        onChange={() => setPickedId(pkg.id)}
                      />
                    </td>
                    <td>{RATE_LABEL[pkg.price_type] ?? pkg.price_type}</td>
                    <td>
                      {pkg.is_discount_active && <del className="text-muted mr-2">{taka(pkg.price)}</del>}
                      <strong>{taka(pkg.discounted_price)}</strong>
                      {pkg.price_type !== "fixed" && (
                        <small className="text-muted"> / {PRICE_UNIT[pkg.price_type]}</small>
                      )}
                    </td>
                    <td>{pkg.description ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AddToCart
          key={picked?.id ?? "none"}
          kind="service"
          listingId={gig.id}
          skuId={picked?.id ?? null}
          sellerId={gig.seller.id}
          priceType={picked?.price_type ?? null}
          blockedReason={picked ? null : "This service has no package to order."}
        />
        <CartStatus type="service" sellerId={gig.seller.id} />
      </div>

      <div className="bg-white p-3 mt-3">
        <h5>About this service</h5>
        <p style={{ whiteSpace: "pre-line" }}>{gig.description || "No description."}</p>
        {gig.package_includes && (
          <>
            <h6>What is included</h6>
            <p style={{ whiteSpace: "pre-line" }} className="mb-0">
              {gig.package_includes}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
