"use client";

import Link from "next/link";
import { getPublicSeller } from "@/lib/buyer/public-sellers-api";
import { resolveMediaUrl } from "@/lib/env";
import { SHOP } from "../shop-links";
import { DetailMessage, useDetail } from "./use-detail";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <tr>
      <th style={{ width: "35%" }}>{label}</th>
      <td>{value}</td>
    </tr>
  );
}

function plain(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .filter((v) => typeof v === "string" || typeof v === "number")
      .join(" · ");
  }
  return "";
}

export function SellerPage({ id }: { id: number }) {
  const state = useDetail(() => getPublicSeller(id), id);
  if (state.status !== "ready") return <div className="container my-4"><DetailMessage state={state} what="Seller" /></div>;
  const seller = state.data;
  const place = [seller.location.thana, seller.location.city, seller.location.state, seller.location.country]
    .filter(Boolean)
    .join(", ");
  const business = seller.business;
  const contact = seller.contact;
  const contactRows: [string, string | null][] = contact
    ? [
        ["Email", contact.public_email],
        ["WhatsApp", contact.whatsapp],
        ["Facebook", contact.facebook],
        ["WeChat", contact.wechat],
        ["Skype", contact.skype],
      ]
    : [];
  const shownContact = contactRows.filter(([, v]) => v);
  const businessHasData =
    business != null && Object.values(business).some((v) => v != null && v !== "");
  const lists = [
    { label: "Products", count: seller.product_count, href: `${SHOP.products}?seller=${seller.id}` },
    { label: "Services", count: seller.gig_count, href: `${SHOP.services}?seller=${seller.id}` },
  ];

  return (
    <div className="container-fluid p-587 my-3">
      <div className="row bg-white p-3 align-items-center">
        <div className="col-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(seller.profile_pic_url) ?? "/shop/images/no-img.jpg"}
            alt={seller.name}
            width={96}
            height={96}
            className="rounded-circle"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="col">
          <h3 className="mb-1">{seller.name}</h3>
          <p className="text-muted mb-0">
            Member since {new Date(seller.member_since).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
            {place && (
              <>
                {" · "}
                <i className="fas fa-map-marker-alt" /> {place}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="row mt-3">
        {lists.map((list) => (
          <div key={list.label} className="col-6 mb-3">
            <Link href={list.href} className="btn btn-light border w-100 py-3">
              <strong className="d-block" style={{ fontSize: "1.4rem" }}>
                {list.count}
              </strong>
              {list.label}
            </Link>
          </div>
        ))}
      </div>

      <div className="row">
        {businessHasData && business && (
          <div className="col-md-6 mb-3">
            <div className="bg-white p-3 h-100">
              <h5>Business</h5>
              <table className="table table-sm mb-0">
                <tbody>
                  <Row label="Type" value={business.business_type} />
                  <Row label="Sells" value={business.main_product} />
                  <Row label="Since" value={business.established_year} />
                  <Row label="Team size" value={business.employees_range} />
                </tbody>
              </table>
              {business.description && <p className="mt-2 mb-0">{business.description}</p>}
            </div>
          </div>
        )}
        {shownContact.length > 0 && (
          <div className="col-md-6 mb-3">
            <div className="bg-white p-3 h-100">
              <h5>Contact</h5>
              <table className="table table-sm mb-0">
                <tbody>
                  {shownContact.map(([label, value]) => (
                    <Row key={label} label={label} value={value} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {seller.skills && seller.skills.length > 0 && (
          <div className="col-12 mb-3">
            <div className="bg-white p-3">
              <h5>Skills</h5>
              {seller.skills.map((skill) => (
                <span key={skill} className="badge badge-light border mr-2 p-2">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
        {[
          ["Education", seller.education],
          ["Experience", seller.experience],
        ].map(
          ([label, items]) =>
            Array.isArray(items) &&
            items.length > 0 && (
              <div key={label as string} className="col-md-6 mb-3">
                <div className="bg-white p-3 h-100">
                  <h5>{label as string}</h5>
                  <ul className="mb-0 pl-3">
                    {(items as unknown[]).map((item, i) => (
                      <li key={i}>{plain(item)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
        )}
      </div>
    </div>
  );
}
