"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/env";
import { ListingInfoChangeLog } from "@/lib/listing-api";
import { formatAmount, formatDateTime } from "./listing-utils";
import styles from "../../management.module.css";

const KEY_LABELS: Record<string, string> = {
  title: "Title",
  title_bn: "Title (Bangla)",
  description: "Description",
  description_bn: "Description (Bangla)",
  catalog_type: "Catalog type",
  listing_type: "Listing format",
  category: "Category",
  brand: "Brand",
  measurement: "Measurement unit",
  model: "Model",
  origin: "Origin",
  origin_bn: "Origin (Bangla)",
  warranty: "Warranty",
  warranty_bn: "Warranty (Bangla)",
  min_order_qty: "Minimum order quantity",
  condition_note: "Condition note",
  condition_note_bn: "Condition note (Bangla)",
  attributes: "Specifications",
  price_type: "Price type",
  hourly_rate: "Hourly rate",
  delivery_days: "Delivery days",
  urgent: "Urgent",
  package_includes: "Package includes",
  package_includes_bn: "Package includes (Bangla)",
  available_from: "Available from",
  available_to: "Available to",
  country: "Country",
  state: "State",
  city: "City",
  thana: "Thana",
  seller: "Seller",
  buyer: "Buyer",
  posted_by_role: "Posted as",
  currency: "Currency",
  price_tiers: "Price tiers",
  skus: "Options and prices (SKUs)",
  media: "Pictures and files",
};

const DATE_KEYS = new Set(["available_from", "available_to"]);

function labelFor(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/_/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One readable line for a single value: text, a Yes/No, a place or brand
 * (`{id, name}`) or a set of specifications. */
function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && DATE_KEYS.has(key)) return formatDateTime(value);
  if (isRecord(value) && "name" in value) return String(value.name);
  if (key === "attributes" && isRecord(value)) {
    const entries = Object.entries(value);
    return entries.length === 0 ? "—" : entries.map(([k, v]) => `${k}: ${String(v)}`).join(", ");
  }
  if (isRecord(value) || Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function Diff({
  label,
  before,
  after,
}: {
  label: string;
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  return (
    <div className={styles.diffLine}>
      <span className={styles.diffLabel}>{label}</span>
      <span className={styles.diffBefore}>{before}</span>
      <span className={styles.diffArrow} aria-label="changed to">
        →
      </span>
      <span className={styles.diffAfter}>{after}</span>
    </div>
  );
}

// ---------------------------------------------------------------- price tiers

interface TierSnapshot {
  min_qty: number;
  max_qty: number | null;
  price: string;
  discounted_price: string | null;
  listing_sku?: number | null;
}

function tiers(value: unknown): TierSnapshot[] {
  return Array.isArray(value) ? (value as TierSnapshot[]) : [];
}

function tierText(tier: TierSnapshot): string {
  const range = `${tier.min_qty}${tier.max_qty != null ? ` – ${tier.max_qty}` : "+"}`;
  const discounted =
    tier.discounted_price != null && Number(tier.discounted_price) < Number(tier.price)
      ? ` (discount ${formatAmount(tier.discounted_price)})`
      : "";
  return `${range}: ${formatAmount(tier.price)}${discounted}`;
}

function TiersBlock({ previous, next }: { previous: unknown; next: unknown }) {
  const before = tiers(previous).map(tierText);
  const after = tiers(next).map(tierText);
  return (
    <div className={styles.diffGroup}>
      <span className={styles.diffLabel}>{labelFor("price_tiers")}</span>
      <div className={styles.diffLine}>
        <span className={styles.diffBefore}>
          {before.length === 0 ? "No tiers" : before.join(" · ")}
        </span>
        <span className={styles.diffArrow}>→</span>
        <span className={styles.diffAfter}>{after.length === 0 ? "No tiers" : after.join(" · ")}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- SKUs

interface SkuSnapshot {
  id: number;
  sku?: string | null;
  price: string;
  options?: string[];
  is_active: boolean;
  discounted_price?: string | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
}

function skus(value: unknown): SkuSnapshot[] {
  return Array.isArray(value) ? (value as SkuSnapshot[]) : [];
}

/** A discount as one line: the discounted price and its window. */
function discountText(sku: SkuSnapshot): string {
  if (sku.discounted_price == null || Number(sku.discounted_price) >= Number(sku.price)) {
    return "No discount";
  }
  const start = sku.discount_start_date ? formatDateTime(sku.discount_start_date) : "no start";
  const end = sku.discount_end_date ? formatDateTime(sku.discount_end_date) : "no end";
  const window = sku.discount_start_date || sku.discount_end_date ? ` (${start} → ${end})` : "";
  return `${formatAmount(sku.discounted_price)}${window}`;
}

/** One cell of the SKU table: just the value when it did not change, "before →
 * after" when it did. */
function Cell({ before, after }: { before: string; after: string }) {
  if (before === after) return <td>{after}</td>;
  return (
    <td>
      <span className={styles.diffBefore}>{before}</span> <span className={styles.diffArrow}>→</span>{" "}
      <span className={styles.diffAfter}>{after}</span>
    </td>
  );
}

/** The whole SKU list before and after, one row per SKU, with the cells that
 * changed shown as "before → after". Stock is not recorded, so it is not
 * here. */
function SkusBlock({ previous, next }: { previous: unknown; next: unknown }) {
  const before = skus(previous);
  const after = skus(next);
  const beforeById = new Map(before.map((sku) => [sku.id, sku]));
  const afterById = new Map(after.map((sku) => [sku.id, sku]));
  const ids = Array.from(new Set([...before.map((s) => s.id), ...after.map((s) => s.id)]));

  const rows = ids.map((id) => {
    const was = beforeById.get(id);
    const now = afterById.get(id);
    const base = (now ?? was) as SkuSnapshot;
    const changed =
      !was ||
      !now ||
      was.price !== now.price ||
      discountText(was) !== discountText(now) ||
      was.is_active !== now.is_active ||
      (was.sku ?? "") !== (now.sku ?? "");
    return { id, was, now, base, changed };
  });
  const changedCount = rows.filter((row) => row.changed).length;

  return (
    <div className={styles.diffGroup}>
      <span className={styles.diffLabel}>
        {labelFor("skus")} — {changedCount} changed of {rows.length}
      </span>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Option</th>
              <th>Code</th>
              <th>Price</th>
              <th>Discount</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, was, now, base, changed }) => (
              <tr key={id} className={changed ? undefined : styles.skuRowInactive}>
                <td className={styles.primaryText}>
                  {(base.options ?? []).length > 0 ? (base.options ?? []).join(" · ") : "Default"}
                </td>
                {was && now ? (
                  <>
                    <Cell before={was.sku || "—"} after={now.sku || "—"} />
                    <Cell before={formatAmount(was.price)} after={formatAmount(now.price)} />
                    <Cell before={discountText(was)} after={discountText(now)} />
                    <Cell
                      before={was.is_active ? "Active" : "Inactive"}
                      after={now.is_active ? "Active" : "Inactive"}
                    />
                  </>
                ) : (
                  <>
                    <td>{base.sku || "—"}</td>
                    <td>{formatAmount(base.price)}</td>
                    <td>{discountText(base)}</td>
                    <td>{base.is_active ? "Active" : "Inactive"}</td>
                  </>
                )}
                <td>
                  {!was ? (
                    <span className={`${styles.badge} ${styles.badgeGreen}`}>Added</span>
                  ) : !now ? (
                    <span className={`${styles.badge} ${styles.badgeRed}`}>Removed</span>
                  ) : changed ? (
                    <span className={`${styles.badge} ${styles.badgeAmber}`}>Changed</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- media

interface MediaSnapshot {
  id: number;
  media_url: string;
  media_type: string;
}

function mediaList(value: unknown): MediaSnapshot[] {
  return Array.isArray(value) ? (value as MediaSnapshot[]) : [];
}

/** A small picture that says so when its file is gone (a removed file is
 * deleted from storage, so an old picture can no longer exist). */
function Thumb({ media }: { media: MediaSnapshot }) {
  const [broken, setBroken] = useState(false);
  const href = resolveMediaUrl(media.media_url);
  if (media.media_type !== "image" || !href) {
    return <span className={styles.secondaryText}>{media.media_type}</span>;
  }
  if (broken) return <span className={styles.secondaryText}>(file no longer stored)</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt="" className={styles.historyThumb} onError={() => setBroken(true)} />;
}

function MediaBlock({ previous, next }: { previous: unknown; next: unknown }) {
  const before = mediaList(previous);
  const after = mediaList(next);
  const beforeIds = new Set(before.map((m) => m.id));
  const afterIds = new Set(after.map((m) => m.id));
  const added = after.filter((m) => !beforeIds.has(m.id));
  const removed = before.filter((m) => !afterIds.has(m.id));
  const kept = after.length - added.length;
  return (
    <div className={styles.diffGroup}>
      <span className={styles.diffLabel}>{labelFor("media")}</span>
      <div className={styles.diffLine}>
        {added.length > 0 && (
          <span className={styles.diffAfter}>
            Added {added.length}:{" "}
            {added.map((m) => (
              <Thumb key={m.id} media={m} />
            ))}
          </span>
        )}
        {removed.length > 0 && (
          <span className={styles.diffBefore} style={{ textDecoration: "none" }}>
            Removed {removed.length}:{" "}
            {removed.map((m) => (
              <Thumb key={m.id} media={m} />
            ))}
          </span>
        )}
        {kept > 0 && <span className={styles.secondaryText}>{kept} unchanged</span>}
        {added.length === 0 && removed.length === 0 && (
          <span className={styles.secondaryText}>No file added or removed.</span>
        )}
      </div>
    </div>
  );
}

/** What changed under one key of one log row. */
function ChangeBlock({
  field,
  previous,
  next,
}: {
  field: string;
  previous: unknown;
  next: unknown;
}) {
  if (field === "price_tiers") return <TiersBlock previous={previous} next={next} />;
  if (field === "skus") return <SkusBlock previous={previous} next={next} />;
  if (field === "media") return <MediaBlock previous={previous} next={next} />;
  return (
    <Diff
      label={labelFor(field)}
      before={formatValue(field, previous)}
      after={formatValue(field, next)}
    />
  );
}

/** Listing Details (admin only): every save that really changed the content,
 * by the seller OR an admin, newest first. One row per save; each changed key
 * shows "before → after". Status changes are NOT here (they are in the status
 * history) and neither is stock. */
export function ListingChangeHistory({ logs }: { logs: ListingInfoChangeLog[] }) {
  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Content change history</h2>
      {logs.length === 0 ? (
        <p className={styles.stateRow}>No content changes yet.</p>
      ) : (
        <ol className={styles.changeLog}>
          {logs.map((log) => (
            <li key={log.id} className={styles.changeRow}>
              <div className={styles.changeHead}>
                <strong>{log.creator_name}</strong>
                <span
                  className={`${styles.badge} ${
                    log.creator_type === "admin" ? styles.badgeGray : styles.badgeGreen
                  }`}
                >
                  {log.creator_type}
                </span>
                <span className={styles.secondaryText}>{formatDateTime(log.created_at)}</span>
              </div>
              <div className={styles.changeBody}>
                {log.changed_fields.map((field) => (
                  <ChangeBlock
                    key={field}
                    field={field}
                    previous={log.previous_data?.[field]}
                    next={log.new_data?.[field]}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
