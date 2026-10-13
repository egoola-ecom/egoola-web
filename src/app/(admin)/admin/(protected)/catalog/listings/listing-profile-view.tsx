"use client";

import { useEffect, useState } from "react";
import { getBuyer, getSeller } from "@/lib/accounts-api";
import { getCategoryParentChain } from "@/lib/category-api";
import { resolveMediaUrl } from "@/lib/env";
import { ListingCore, ListingDetail } from "@/lib/listing-api";
import { listAllMeasurements } from "@/lib/measurement-api";
import { ReadonlyField } from "../../_shared/readonly-field";
import { useResolvedLocation } from "../../_shared/use-resolved-location";
import {
  PriceDisplay,
  formatAmount,
  formatDateTime,
  listingTypeLabel,
  POSTED_BY_ROLE_OPTIONS,
} from "./listing-utils";
import { discountStatus } from "./sku-model";
import styles from "../../management.module.css";

/** Names for the ids a listing carries — category chain, measurement unit
 * and owner — fetched once per listing. Each stays null until it resolves. */
function useListingNames(listing: ListingDetail) {
  const [category, setCategory] = useState<string | null>(null);
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategoryParentChain([listing.category])
      .then((chains) => {
        const chain = chains[0];
        if (!cancelled && chain) {
          setCategory([...chain.parents, chain].map((c) => c.name).join(" › "));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listing.category]);

  useEffect(() => {
    if (listing.measurement == null) return;
    let cancelled = false;
    listAllMeasurements()
      .then((all) => {
        const found = all.find((m) => m.id === listing.measurement);
        if (!cancelled && found) setMeasurement(`${found.name} (${found.symbol})`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listing.measurement]);

  useEffect(() => {
    const request =
      listing.seller != null
        ? getSeller(listing.seller)
        : listing.buyer != null
          ? getBuyer(listing.buyer)
          : null;
    if (!request) return;
    let cancelled = false;
    request
      .then((person) => {
        if (!cancelled) setOwner(person.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listing.seller, listing.buyer]);

  return { category, measurement, owner };
}

function orDash(value: string | number | null | undefined): string {
  return value == null || value === "" ? "—" : String(value);
}

/** What a price tier covers: the whole listing, or one of its SKUs. */
export function tierScope(listing: ListingCore, skuId: number | null | undefined): string {
  if (skuId == null) return "Whole listing";
  const sku = listing.skus.find((item) => item.id === skuId);
  if (!sku) return `SKU #${skuId}`;
  const options = sku.variants.map((v) => `${v.attribute_name}: ${v.attribute_value_name}`).join(" · ");
  return [sku.sku, options].filter(Boolean).join(" — ") || `SKU #${skuId}`;
}

const DISCOUNT_TEXT = {
  none: "No discount",
  active: "Live now",
  scheduled: "Not started yet",
  expired: "Ended",
} as const;

function windowText(start: string | null, end: string | null): string {
  if (!start && !end) return "Always";
  return `${start ? formatDateTime(start) : "No start"} → ${end ? formatDateTime(end) : "No end"}`;
}

/** Every SKU of the listing — inactive ones stay listed (greyed), since a SKU
 * is only ever hidden, never deleted. */
export function SkuTable({ listing }: { listing: ListingCore }) {
  const [now] = useState(() => Date.now());
  if (listing.skus.length === 0) {
    return <p className={styles.stateRow}>This listing has no SKUs.</p>;
  }
  const skus = [...listing.skus].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Option</th>
            <th>Code</th>
            <th>Price</th>
            <th>Discount window</th>
            <th>Stock</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => {
            const status = discountStatus(sku, now);
            return (
              <tr key={sku.id} className={sku.is_active ? undefined : styles.skuRowInactive}>
                <td className={styles.primaryText}>
                  {sku.variants.length === 0
                    ? "Default"
                    : sku.variants.map((v) => `${v.attribute_name}: ${v.attribute_value_name}`).join(" · ")}
                </td>
                <td className={styles.codeText}>{sku.sku || "—"}</td>
                <td>
                  <PriceDisplay
                    price={sku.price}
                    discountedPrice={sku.effective_price}
                    currency={listing.currency}
                  />
                </td>
                <td className={styles.secondaryText}>
                  {status === "none" ? (
                    DISCOUNT_TEXT.none
                  ) : (
                    <>
                      <div>
                        {formatAmount(sku.discounted_price, listing.currency)} ·{" "}
                        <span className={status === "active" ? styles.primaryText : undefined}>
                          {DISCOUNT_TEXT[status]}
                        </span>
                      </div>
                      <div>{windowText(sku.discount_start_date, sku.discount_end_date)}</div>
                    </>
                  )}
                </td>
                <td>
                  {sku.stock_qty == null ? (
                    <span className={styles.secondaryText}>Not tracked</span>
                  ) : (
                    <>
                      {sku.stock_qty}
                      {sku.reserved_qty > 0 && (
                        <span className={styles.secondaryText}> ({sku.reserved_qty} reserved)</span>
                      )}
                    </>
                  )}
                </td>
                <td>
                  <span className={`${styles.badge} ${sku.is_active ? styles.badgeGreen : styles.badgeGray}`}>
                    {sku.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Read-only display of everything a Listing Details page shows beyond the
 * header and moderation: overview, pricing + tiers, product/service fields,
 * location and media. Editing happens on the separate Listing Update page. */
export function ListingProfileView({ listing }: { listing: ListingDetail }) {
  const names = useListingNames(listing);
  const location = useResolvedLocation(listing);
  const isProduct = listing.catalog_type === "product";

  const ownerText =
    listing.seller != null
      ? `Seller · ${names.owner ?? `#${listing.seller}`}`
      : listing.buyer != null
        ? `Buyer · ${names.owner ?? `#${listing.buyer}`}`
        : "No owner (admin listing)";

  const hasAttributes =
    listing.attributes != null &&
    (typeof listing.attributes !== "object" || Object.keys(listing.attributes).length > 0);

  return (
    <>
      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Overview</h2>
        <div className={styles.formGrid}>
          <ReadonlyField label="Catalog type" value={isProduct ? "Product" : "Service"} />
          <ReadonlyField label="Listing format" value={listingTypeLabel(listing.listing_type)} />
          <div className={styles.formGridFull}>
            <ReadonlyField label="Category" value={names.category ?? `#${listing.category}`} />
          </div>
          <ReadonlyField label="Owner" value={ownerText} />
          <ReadonlyField
            label="Posted as"
            value={
              POSTED_BY_ROLE_OPTIONS.find((opt) => opt.value === listing.posted_by_role)?.label ??
              "—"
            }
          />
          <ReadonlyField label="Brand" value={orDash(listing.brand_name)} />
          <ReadonlyField label="Model" value={orDash(listing.model)} />
          <ReadonlyField label="Origin" value={orDash(listing.origin)} />
          <ReadonlyField label="Origin (Bangla)" value={orDash(listing.origin_bn)} />
          <ReadonlyField label="Warranty" value={orDash(listing.warranty)} />
          <ReadonlyField label="Warranty (Bangla)" value={orDash(listing.warranty_bn)} />
          <div className={styles.formGridFull}>
            <ReadonlyField label="Title (Bangla)" value={orDash(listing.title_bn)} />
          </div>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Description" value={listing.description} />
          </div>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Description (Bangla)" value={orDash(listing.description_bn)} />
          </div>
          <ReadonlyField label="Slug" value={listing.slug} />
          <ReadonlyField label="Created" value={formatDateTime(listing.created_at)} />
          <ReadonlyField
            label="Sent for review"
            value={listing.requested_at ? formatDateTime(listing.requested_at) : "— (admin listing)"}
          />
          <ReadonlyField label="Last updated" value={formatDateTime(listing.updated_at)} />
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Pricing &amp; stock</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>From price (cheapest active SKU)</span>
            <p className={styles.readonlyValue}>
              <PriceDisplay
                price={listing.price}
                discountedPrice={listing.discounted_price}
                currency={listing.currency}
              />
            </p>
          </div>
          <ReadonlyField label="Currency" value={listing.currency} />
        </div>

        <h3 className={styles.detailCardSubtitle}>SKUs</h3>
        <SkuTable listing={listing} />

        {listing.price_tiers.length > 0 && (
          <>
            <h3 className={styles.detailCardSubtitle}>Price tiers</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Applies to</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.price_tiers.map((tier) => (
                    <tr key={tier.id}>
                      <td className={styles.codeText}>
                        {tier.min_qty}
                        {tier.max_qty != null ? ` – ${tier.max_qty}` : "+"}
                      </td>
                      <td>
                        <PriceDisplay
                          price={tier.price}
                          discountedPrice={tier.discounted_price}
                          currency={listing.currency}
                        />
                      </td>
                      <td className={styles.secondaryText}>{tierScope(listing, tier.listing_sku)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>{isProduct ? "Product details" : "Service details"}</h2>
        <div className={styles.formGrid}>
          {isProduct ? (
            <>
              <ReadonlyField label="Minimum order quantity" value={orDash(listing.min_order_qty)} />
              <ReadonlyField
                label="Measurement unit"
                value={listing.measurement == null ? "—" : (names.measurement ?? `#${listing.measurement}`)}
              />
              <div className={styles.formGridFull}>
                <ReadonlyField label="Condition note" value={orDash(listing.condition_note)} />
              </div>
              <div className={styles.formGridFull}>
                <ReadonlyField label="Condition note (Bangla)" value={orDash(listing.condition_note_bn)} />
              </div>
            </>
          ) : (
            <>
              <ReadonlyField label="Price type" value={orDash(listing.price_type)} />
              {listing.price_type === "hourly" && (
                <ReadonlyField
                  label="Hourly rate"
                  value={listing.hourly_rate ? formatAmount(listing.hourly_rate, listing.currency) : "—"}
                />
              )}
              <ReadonlyField label="Delivery days" value={orDash(listing.delivery_days)} />
              <ReadonlyField label="Urgent" value={listing.urgent ? "Yes" : "No"} />
              <ReadonlyField
                label="Available from"
                value={listing.available_from ? formatDateTime(listing.available_from) : "—"}
              />
              <ReadonlyField
                label="Available to"
                value={listing.available_to ? formatDateTime(listing.available_to) : "—"}
              />
              <div className={styles.formGridFull}>
                <ReadonlyField label="Package includes" value={orDash(listing.package_includes)} />
              </div>
              <div className={styles.formGridFull}>
                <ReadonlyField label="Package includes (Bangla)" value={orDash(listing.package_includes_bn)} />
              </div>
            </>
          )}
          {hasAttributes && (
            <>
              <p className={styles.sectionDivider}>Attributes</p>
              <pre className={styles.preBlock}>{JSON.stringify(listing.attributes, null, 2)}</pre>
            </>
          )}
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Location &amp; media</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Location" value={location || "—"} />
          </div>
          {listing.media.length === 0 ? (
            <div className={styles.formGridFull}>
              <ReadonlyField label="Media" value="No media uploaded." />
            </div>
          ) : (
            <div className={styles.mediaGrid}>
              {listing.media.map((media) => {
                const url = resolveMediaUrl(media.media_url);
                return (
                  <div key={media.id} className={styles.mediaTile}>
                    {media.media_type === "image" && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className={styles.mediaTilePreview} />
                    ) : (
                      <span className={styles.mediaTilePreview}>{media.media_type}</span>
                    )}
                    <a
                      href={url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.mediaLink}
                    >
                      Open
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
