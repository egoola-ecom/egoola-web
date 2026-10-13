"use client";

import { useEffect, useState } from "react";
import { getSeller } from "@/lib/accounts-api";
import { getCategoryParentChain } from "@/lib/category-api";
import { resolveMediaUrl } from "@/lib/env";
import { GigDetail } from "@/lib/gig-api";
import { ReadonlyField } from "../_shared/readonly-field";
import { useResolvedLocation } from "../_shared/use-resolved-location";
import { formatAmount, formatDateTime } from "../catalog/listings/listing-utils";
import { discountStatus } from "../catalog/listings/sku-model";
import { RateDisplay, priceTypeLabel, rateText } from "./gig-utils";
import styles from "../management.module.css";

/** Names for the ids a gig carries — category chain and owner — fetched once
 * per gig. Each stays null until it resolves. */
function useGigNames(gig: GigDetail) {
  const [category, setCategory] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategoryParentChain([gig.category])
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
  }, [gig.category]);

  useEffect(() => {
    if (gig.seller == null) return;
    let cancelled = false;
    getSeller(gig.seller)
      .then((person) => {
        if (!cancelled) setOwner(person.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gig.seller]);

  return { category, owner };
}

function orDash(value: string | number | null | undefined): string {
  return value == null || value === "" ? "—" : String(value);
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

/** Every package of the gig — hidden ones stay listed (greyed), since a
 * package is only ever hidden, never deleted. */
export function PackagesTable({ gig }: { gig: Pick<GigDetail, "skus" | "currency"> }) {
  const [now] = useState(() => Date.now());
  if (gig.skus.length === 0) {
    return <p className={styles.stateRow}>This gig has no packages.</p>;
  }
  const skus = [...gig.skus].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Price type</th>
            <th>Code</th>
            <th>Rate</th>
            <th>Rate now</th>
            <th>Discount window</th>
            <th>Description</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => {
            const status = discountStatus(sku, now);
            return (
              <tr key={sku.id} className={sku.is_active ? undefined : styles.skuRowInactive}>
                <td className={styles.primaryText}>{priceTypeLabel(sku.price_type)}</td>
                <td className={styles.codeText}>{sku.sku || "—"}</td>
                <td>{rateText(sku.price, sku.price_type, gig.currency)}</td>
                <td>
                  <RateDisplay
                    price={sku.price}
                    discountedPrice={sku.effective_price}
                    priceType={sku.price_type}
                    currency={gig.currency}
                  />
                </td>
                <td className={styles.secondaryText}>
                  {status === "none" ? (
                    DISCOUNT_TEXT.none
                  ) : (
                    <>
                      <div>
                        {formatAmount(sku.discounted_price, gig.currency)} ·{" "}
                        <span className={status === "active" ? styles.primaryText : undefined}>
                          {DISCOUNT_TEXT[status]}
                        </span>
                      </div>
                      <div>{windowText(sku.discount_start_date, sku.discount_end_date)}</div>
                    </>
                  )}
                </td>
                <td className={styles.secondaryText}>
                  {sku.description || sku.description_bn ? (
                    <>
                      {sku.description && <div>{sku.description}</div>}
                      {sku.description_bn && <div lang="bn">{sku.description_bn}</div>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span className={`${styles.badge} ${sku.is_active ? styles.badgeGreen : styles.badgeGray}`}>
                    {sku.is_active ? "Active" : "Hidden"}
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

/** Read-only display of everything a Gig Details page shows beyond the header,
 * moderation and history: overview, packages, service details, location and
 * gallery. Editing happens on the separate Gig Update page. */
export function GigProfileView({ gig }: { gig: GigDetail }) {
  const names = useGigNames(gig);
  const location = useResolvedLocation(gig);
  const ownerText =
    gig.seller != null ? `Seller · ${names.owner ?? `#${gig.seller}`}` : "No owner (admin gig)";

  return (
    <>
      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Overview</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Service category" value={names.category ?? `#${gig.category}`} />
          </div>
          <ReadonlyField label="Owner" value={ownerText} />
          <ReadonlyField label="Currency" value={gig.currency} />
          <div className={styles.formGridFull}>
            <ReadonlyField label="Title (Bangla)" value={orDash(gig.title_bn)} />
          </div>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Description" value={gig.description} />
          </div>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Description (Bangla)" value={orDash(gig.description_bn)} />
          </div>
          <ReadonlyField label="Slug" value={gig.slug} />
          <ReadonlyField label="Created" value={formatDateTime(gig.created_at)} />
          <ReadonlyField
            label="Sent for review"
            value={gig.requested_at ? formatDateTime(gig.requested_at) : "— (admin gig)"}
          />
          <ReadonlyField label="Last updated" value={formatDateTime(gig.updated_at)} />
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Packages &amp; pricing</h2>
        <div className={styles.field}>
          <span className={styles.label}>From (lowest rate among the active packages)</span>
          <p className={styles.readonlyValue}>
            {gig.price != null && gig.discounted_price != null ? (
              <RateDisplay
                price={gig.price}
                discountedPrice={gig.discounted_price}
                priceType={
                  [...gig.skus]
                    .filter((sku) => sku.is_active)
                    .sort((a, b) => Number(a.effective_price) - Number(b.effective_price))[0]
                    ?.price_type ?? null
                }
                currency={gig.currency}
              />
            ) : (
              <span className={styles.secondaryText}>No active package</span>
            )}
          </p>
        </div>
        <h3 className={styles.detailCardSubtitle}>Packages</h3>
        <PackagesTable gig={gig} />
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Service details</h2>
        <div className={styles.formGrid}>
          <ReadonlyField label="Delivery days" value={orDash(gig.delivery_days)} />
          <ReadonlyField label="Urgent" value={gig.urgent ? "Yes" : "No"} />
          <ReadonlyField
            label="Available from"
            value={gig.available_from ? formatDateTime(gig.available_from) : "—"}
          />
          <ReadonlyField
            label="Available to"
            value={gig.available_to ? formatDateTime(gig.available_to) : "—"}
          />
          <div className={styles.formGridFull}>
            <ReadonlyField label="Package includes" value={orDash(gig.package_includes)} />
          </div>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Package includes (Bangla)" value={orDash(gig.package_includes_bn)} />
          </div>
        </div>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Location &amp; gallery</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGridFull}>
            <ReadonlyField label="Location" value={location || "—"} />
          </div>
          {gig.media.length === 0 ? (
            <div className={styles.formGridFull}>
              <ReadonlyField label="Gallery" value="No media uploaded." />
            </div>
          ) : (
            <div className={styles.mediaGrid}>
              {gig.media.map((media) => {
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
