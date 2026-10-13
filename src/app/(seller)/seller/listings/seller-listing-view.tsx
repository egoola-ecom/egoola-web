"use client";

import { useEffect, useMemo, useState } from "react";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { ReadonlyField } from "@/app/(admin)/admin/(protected)/_shared/readonly-field";
import {
  PriceDisplay,
  formatDateTime,
  listingTypeLabel,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import {
  SkuTable,
  tierScope,
} from "@/app/(admin)/admin/(protected)/catalog/listings/listing-profile-view";
import { resolveMediaUrl } from "@/lib/env";
import { GeographyOption, publicGeographyLoaders } from "@/lib/geography-api";
import {
  SellerListingDetail,
  SellerLookupCategory,
  SellerLookupMeasurement,
  listSellerCategories,
  listSellerMeasurements,
} from "@/lib/seller-listing-api";
import { describeStatusLog } from "./listing-status";

function orDash(value: string | number | null | undefined): string {
  return value == null || value === "" ? "—" : String(value);
}

function firstName(options: GeographyOption[], id: number | null): string | null {
  return id == null ? null : (options.find((o) => o.id === id)?.name ?? null);
}

/** Names for the ids a listing carries (category chain, unit, place), through
 * the seller's own read-only lookups and the public geography lists. */
function useListingNames(listing: SellerListingDetail) {
  const [categories, setCategories] = useState<SellerLookupCategory[]>([]);
  const [measurements, setMeasurements] = useState<SellerLookupMeasurement[]>([]);
  const [place, setPlace] = useState<string>("");

  useEffect(() => {
    listSellerCategories("product")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (listing.measurement == null) return;
    listSellerMeasurements()
      .then(setMeasurements)
      .catch(() => setMeasurements([]));
  }, [listing.measurement]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const names: (string | null)[] = [];
      try {
        const countries = await publicGeographyLoaders.countries();
        names.push(firstName(countries.results, listing.country));
        if (listing.country != null) {
          const states = await publicGeographyLoaders.states(listing.country);
          names.push(firstName(states.results, listing.state));
          if (listing.state != null) {
            const cities = await publicGeographyLoaders.cities(listing.state);
            names.push(firstName(cities.results, listing.city));
            if (listing.city != null) {
              const thanas = await publicGeographyLoaders.thanas(listing.city);
              names.push(firstName(thanas.results, listing.thana));
            }
          }
        }
      } catch {
        // A place that cannot be named is simply left out.
      }
      if (!cancelled) setPlace(names.filter(Boolean).join(" › "));
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.country, listing.state, listing.city, listing.thana]);

  const category = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const trail: string[] = [];
    let current = byId.get(listing.category);
    while (current) {
      trail.unshift(current.name_bn ? `${current.name} (${current.name_bn})` : current.name);
      current = current.parent != null ? byId.get(current.parent) : undefined;
    }
    return trail.length > 0 ? trail.join(" › ") : null;
  }, [categories, listing.category]);

  const measurement = useMemo(() => {
    const found = measurements.find((m) => m.id === listing.measurement);
    return found ? `${found.name} (${found.symbol})` : null;
  }, [measurements, listing.measurement]);

  return { category, measurement, place };
}

/** The status history as a timeline, newest first, in the seller's words. The
 * server tells the seller who did it only as "you" or "an admin". */
export function StatusTimeline({
  listing,
}: {
  listing: Pick<SellerListingDetail, "status_change_logs">;
}) {
  const logs = [...listing.status_change_logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const oldestId = logs.length > 0 ? logs[logs.length - 1].id : null;
  return (
    <div className={management.detailCard}>
      <h2 className={management.detailCardTitle}>History</h2>
      {logs.length === 0 ? (
        <p className={management.stateRow}>No history yet.</p>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.6rem" }}>
          {logs.map((log) => (
            <li key={log.id}>
              <div className={management.primaryText}>{describeStatusLog(log, log.id === oldestId)}</div>
              <div className={management.secondaryText}>{formatDateTime(log.created_at)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Read-only details of one of the seller's listings. */
export function SellerListingView({ listing }: { listing: SellerListingDetail }) {
  const names = useListingNames(listing);
  const hasAttributes =
    listing.attributes != null &&
    typeof listing.attributes === "object" &&
    Object.keys(listing.attributes).length > 0;

  return (
    <>
      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Overview</h2>
        <div className={management.formGrid}>
          <ReadonlyField label="Format" value={listingTypeLabel(listing.listing_type)} />
          <div className={management.formGridFull}>
            <ReadonlyField label="Category" value={names.category ?? `#${listing.category}`} />
          </div>
          <div className={management.formGridFull}>
            <ReadonlyField label="Title in Bangla" value={orDash(listing.title_bn)} />
          </div>
          <div className={management.formGridFull}>
            <ReadonlyField label="Description" value={listing.description} />
          </div>
          {listing.description_bn && (
            <div className={management.formGridFull}>
              <ReadonlyField label="Description in Bangla" value={listing.description_bn} />
            </div>
          )}
          <ReadonlyField label="Created" value={formatDateTime(listing.created_at)} />
          <ReadonlyField label="Last updated" value={formatDateTime(listing.updated_at)} />
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Pricing &amp; stock</h2>
        <div className={management.field}>
          <span className={management.label}>From price (cheapest active option)</span>
          <p className={management.readonlyValue}>
            <PriceDisplay
              price={listing.price}
              discountedPrice={listing.discounted_price}
              currency={listing.currency}
            />
          </p>
        </div>

        <h3 className={management.detailCardSubtitle}>Options and prices</h3>
        <SkuTable listing={listing} />

        {listing.price_tiers.length > 0 && (
          <>
            <h3 className={management.detailCardSubtitle}>Price tiers</h3>
            <div className={management.tableWrap}>
              <table className={management.table}>
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
                      <td className={management.codeText}>
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
                      <td className={management.secondaryText}>{tierScope(listing, tier.listing_sku)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Product details</h2>
        <div className={management.formGrid}>
          <ReadonlyField label="Brand" value={orDash(listing.brand_name)} />
          <ReadonlyField label="Model" value={orDash(listing.model)} />
          <ReadonlyField label="Origin" value={orDash(listing.origin)} />
          <ReadonlyField label="Origin in Bangla" value={orDash(listing.origin_bn)} />
          <ReadonlyField label="Warranty" value={orDash(listing.warranty)} />
          <ReadonlyField label="Warranty in Bangla" value={orDash(listing.warranty_bn)} />
          <ReadonlyField label="Minimum order quantity" value={orDash(listing.min_order_qty)} />
          <ReadonlyField label="Measurement unit" value={orDash(names.measurement)} />
          {(listing.condition_note || listing.condition_note_bn) && (
            <div className={management.formGridFull}>
              <ReadonlyField label="Condition note" value={orDash(listing.condition_note)} />
              <ReadonlyField label="Condition note in Bangla" value={orDash(listing.condition_note_bn)} />
            </div>
          )}
          {hasAttributes && (
            <>
              <p className={management.sectionDivider}>Specifications</p>
              <dl style={{ margin: 0, display: "grid", gap: "0.25rem" }}>
                {Object.entries(listing.attributes as Record<string, unknown>).map(([name, value]) => (
                  <div key={name}>
                    <dt className={management.label} style={{ display: "inline" }}>
                      {name}:{" "}
                    </dt>
                    <dd style={{ display: "inline", margin: 0 }}>{String(value ?? "")}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Place &amp; pictures</h2>
        <div className={management.formGrid}>
          <div className={management.formGridFull}>
            <ReadonlyField label="Location" value={names.place || "—"} />
          </div>
          {listing.media.length === 0 ? (
            <div className={management.formGridFull}>
              <ReadonlyField label="Files" value="No pictures or files yet." />
            </div>
          ) : (
            <div className={management.mediaGrid}>
              {listing.media.map((media) => {
                const url = resolveMediaUrl(media.media_url);
                return (
                  <div key={media.id} className={management.mediaTile}>
                    {media.media_type === "image" && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className={management.mediaTilePreview} />
                    ) : (
                      <span className={management.mediaTilePreview}>{media.media_type}</span>
                    )}
                    <a href={url ?? undefined} target="_blank" rel="noreferrer" className={management.mediaLink}>
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
