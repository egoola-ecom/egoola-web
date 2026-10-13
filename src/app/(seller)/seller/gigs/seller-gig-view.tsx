"use client";

import { useEffect, useState } from "react";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { ReadonlyField } from "@/app/(admin)/admin/(protected)/_shared/readonly-field";
import { formatDateTime } from "@/app/(admin)/admin/(protected)/catalog/listings/listing-utils";
import { PackagesTable } from "@/app/(admin)/admin/(protected)/gigs/gig-profile-view";
import { resolveMediaUrl } from "@/lib/env";
import { GeographyOption, publicGeographyLoaders } from "@/lib/geography-api";
import { SellerGigDetail } from "@/lib/seller-gig-api";
import { SellerLookupCategory, listSellerCategories } from "@/lib/seller-listing-api";

function orDash(value: string | number | null | undefined): string {
  return value == null || value === "" ? "—" : String(value);
}

function firstName(options: GeographyOption[], id: number | null): string | null {
  return id == null ? null : (options.find((o) => o.id === id)?.name ?? null);
}

/** Names for the ids a gig carries (category chain, place), through the
 * seller's own read-only lookups and the public geography lists. */
function useGigNames(gig: SellerGigDetail) {
  const [categories, setCategories] = useState<SellerLookupCategory[]>([]);
  const [place, setPlace] = useState("");

  useEffect(() => {
    listSellerCategories("service")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const names: (string | null)[] = [];
      try {
        const countries = await publicGeographyLoaders.countries();
        names.push(firstName(countries.results, gig.country));
        if (gig.country != null) {
          const states = await publicGeographyLoaders.states(gig.country);
          names.push(firstName(states.results, gig.state));
          if (gig.state != null) {
            const cities = await publicGeographyLoaders.cities(gig.state);
            names.push(firstName(cities.results, gig.city));
            if (gig.city != null) {
              const thanas = await publicGeographyLoaders.thanas(gig.city);
              names.push(firstName(thanas.results, gig.thana));
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
  }, [gig.country, gig.state, gig.city, gig.thana]);

  const category = (() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const trail: string[] = [];
    let current = byId.get(gig.category);
    while (current) {
      trail.unshift(current.name_bn ? `${current.name} (${current.name_bn})` : current.name);
      current = current.parent != null ? byId.get(current.parent) : undefined;
    }
    return trail.length > 0 ? trail.join(" › ") : null;
  })();

  return { category, place };
}

/** Read-only details of one of the seller's gigs. */
export function SellerGigView({ gig }: { gig: SellerGigDetail }) {
  const names = useGigNames(gig);

  return (
    <>
      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Overview</h2>
        <div className={management.formGrid}>
          <div className={management.formGridFull}>
            <ReadonlyField label="Category" value={names.category ?? `#${gig.category}`} />
          </div>
          <div className={management.formGridFull}>
            <ReadonlyField label="Title in Bangla" value={orDash(gig.title_bn)} />
          </div>
          <div className={management.formGridFull}>
            <ReadonlyField label="Description" value={gig.description} />
          </div>
          {gig.description_bn && (
            <div className={management.formGridFull}>
              <ReadonlyField label="Description in Bangla" value={gig.description_bn} />
            </div>
          )}
          <ReadonlyField label="Created" value={formatDateTime(gig.created_at)} />
          <ReadonlyField label="Last updated" value={formatDateTime(gig.updated_at)} />
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Packages</h2>
        <PackagesTable gig={gig} />
        <p className={management.fieldHint}>
          The buyer picks how many hours, days, weeks or months when ordering. A hidden package is
          not sold; edit the gig to show it again.
        </p>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Service details</h2>
        <div className={management.formGrid}>
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
          <div className={management.formGridFull}>
            <ReadonlyField label="Package includes" value={orDash(gig.package_includes)} />
          </div>
          {gig.package_includes_bn && (
            <div className={management.formGridFull}>
              <ReadonlyField label="Package includes in Bangla" value={gig.package_includes_bn} />
            </div>
          )}
        </div>
      </div>

      <div className={management.detailCard}>
        <h2 className={management.detailCardTitle}>Place &amp; pictures</h2>
        <div className={management.formGrid}>
          <div className={management.formGridFull}>
            <ReadonlyField label="Location" value={names.place || "—"} />
          </div>
          {gig.media.length === 0 ? (
            <div className={management.formGridFull}>
              <ReadonlyField label="Files" value="No pictures or files yet." />
            </div>
          ) : (
            <div className={management.mediaGrid}>
              {gig.media.map((media) => {
                const url = resolveMediaUrl(media.media_url);
                return (
                  <div key={media.id} className={management.mediaTile}>
                    {media.media_type === "image" && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className={management.mediaTilePreview} />
                    ) : (
                      <span className={management.mediaTilePreview}>{media.media_type}</span>
                    )}
                    <a
                      href={url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={management.mediaLink}
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
