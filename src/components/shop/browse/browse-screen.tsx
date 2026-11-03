"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listGigs } from "@/lib/buyer/public-gigs-api";
import { listProducts } from "@/lib/buyer/public-products-api";
import { filterErrorText, isInvalidPage } from "@/lib/buyer/public-fetch";
import type { GigRow, PageResult, ProductRow } from "@/lib/buyer/types";
import { GigCard } from "../gig-card";
import { PRODUCT_TYPES, SHOP } from "../shop-links";
import { GeoSelect, GeoValue } from "./geo-select";
import { Pager } from "./pager";
import { ProductCard } from "./product-card";
import { useQueryParams } from "./use-query-params";

type Kind = "product" | "gig";
const PAGE_SIZE = 20;

const LISTING_TYPES: { value: string; label: string }[] = [
  ...PRODUCT_TYPES.map((t) => ({ value: t.listingType, label: t.label })),
  { value: "general", label: "General" },
];
const GIG_PRICE_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "fixed", label: "Fixed price" },
];
const ORDERING = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
];

const FILTER_KEYS = [
  "search",
  "listing_type",
  "in_stock",
  "price_type",
  "price_min",
  "price_max",
  "delivery_days_max",
  "urgent",
  "country",
  "state",
  "city",
  "thana",
] as const;

/** The filters in the sidebar. They are edited freely and sent together with
 * "Apply", so each keystroke is not a request. */
function Filters({
  kind,
  presetType,
  get,
  onApply,
  onClear,
  error,
}: {
  kind: Kind;
  presetType?: string;
  get: (key: string) => string;
  onApply: (patch: Record<string, string>) => void;
  onClear: () => void;
  error: string | null;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(FILTER_KEYS.map((key) => [key, get(key)])),
  );
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const geo: GeoValue = {
    country: draft.country,
    state: draft.state,
    city: draft.city,
    thana: draft.thana,
  };

  return (
    <form
      className="bg-white p-3 mb-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <h6 className="font-weight-bold">Filter</h6>
      <input
        className="form-control form-control-sm mb-2"
        type="search"
        aria-label="Search"
        placeholder={kind === "product" ? "Title, brand or model" : "What do you need?"}
        value={draft.search}
        onChange={(event) => set("search", event.target.value)}
      />
      {kind === "product" && !presetType && (
        <select
          className="form-control form-control-sm mb-2"
          aria-label="Shop"
          value={draft.listing_type}
          onChange={(event) => set("listing_type", event.target.value)}
        >
          <option value="">All shops</option>
          {LISTING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      )}
      {kind === "product" && (
        <select
          className="form-control form-control-sm mb-2"
          aria-label="Stock"
          value={draft.in_stock}
          onChange={(event) => set("in_stock", event.target.value)}
        >
          <option value="">In stock or sold out</option>
          <option value="true">In stock only</option>
          <option value="false">Sold out only</option>
        </select>
      )}
      {kind === "gig" && (
        <>
          <select
            className="form-control form-control-sm mb-2"
            aria-label="Rate type"
            value={draft.price_type}
            onChange={(event) => set("price_type", event.target.value)}
          >
            <option value="">Any rate type</option>
            {GIG_PRICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="form-control form-control-sm mb-2"
            type="number"
            min="1"
            aria-label="Delivered within days"
            placeholder="Delivered within (days)"
            value={draft.delivery_days_max}
            onChange={(event) => set("delivery_days_max", event.target.value)}
          />
          <label className="d-block mb-2">
            <input
              type="checkbox"
              checked={draft.urgent === "true"}
              onChange={(event) => set("urgent", event.target.checked ? "true" : "")}
            />{" "}
            Urgent only
          </label>
        </>
      )}
      <div className="d-flex mb-2">
        <input
          className="form-control form-control-sm mr-1"
          type="number"
          min="0"
          aria-label="Lowest price"
          placeholder="Price from"
          value={draft.price_min}
          onChange={(event) => set("price_min", event.target.value)}
        />
        <input
          className="form-control form-control-sm"
          type="number"
          min="0"
          aria-label="Highest price"
          placeholder="Price to"
          value={draft.price_max}
          onChange={(event) => set("price_max", event.target.value)}
        />
      </div>
      <GeoSelect
        value={geo}
        onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
      />
      {error && (
        <p className="text-danger small" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-success btn-sm mr-2">
        Apply
      </button>
      <button type="button" className="btn btn-light btn-sm border" onClick={onClear}>
        Clear
      </button>
    </form>
  );
}

/** The product list and the gig list: filters in the URL, sort, numbered pages,
 * and a different state for "loading", "nothing matches" and "failed". */
export function BrowseScreen({ kind, presetType }: { kind: Kind; presetType?: string }) {
  const { params, get, update } = useQueryParams();
  const [data, setData] = useState<PageResult<ProductRow | GigRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [pastEnd, setPastEnd] = useState(false);
  const generation = useRef(0);

  const query = params.toString();
  const rawPage = Number(get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  // `?page_size=` is optional (1 to 100); anything else means the default.
  const rawSize = Number(get("page_size"));
  const pageSize = Number.isInteger(rawSize) && rawSize >= 1 && rawSize <= 100 ? rawSize : PAGE_SIZE;

  useEffect(() => {
    const mine = ++generation.current;
    const sent: Record<string, string | number | undefined> = { page_size: pageSize, page };
    for (const key of [
      "category",
      "seller",
      "ordering",
      "brand",
      ...FILTER_KEYS,
    ]) {
      const value = params.get(key);
      if (value) sent[key] = value;
    }
    if (presetType) sent.listing_type = presetType;
    const call = kind === "product" ? listProducts : listGigs;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setPastEnd(false);
    setFilterError(null);
    (call as (q: typeof sent) => Promise<PageResult<ProductRow | GigRow>>)(sent)
      .then((res) => {
        if (generation.current !== mine) return;
        setData(res);
      })
      .catch(async (err) => {
        if (generation.current !== mine) return;
        if (isInvalidPage(err)) {
          // A page past the last: say so, with a way back to the first page.
          setData(null);
          setPastEnd(true);
          return;
        }
        setData(null);
        const text = filterErrorText(err);
        if (err?.status === 400) setFilterError(text);
        else setError("We couldn't load this list. Please try again.");
      })
      .finally(() => {
        if (generation.current === mine) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, kind, presetType]);

  const title = kind === "product" ? "Products" : "Services";
  const typeLabel = PRODUCT_TYPES.find((t) => t.listingType === presetType)?.label;
  const category = get("category");
  const seller = get("seller");
  const rows = data?.results ?? [];
  const sellerName = rows.find((r) => r.seller && String(r.seller.id) === seller)?.seller?.name;
  const anyFilter = FILTER_KEYS.some((k) => get(k)) || category || seller;

  function apply(patch: Record<string, string>) {
    const clean: Record<string, string | undefined> = {};
    for (const key of FILTER_KEYS) clean[key] = patch[key] || undefined;
    update(clean);
  }

  function clear() {
    const clean: Record<string, string | undefined> = {};
    for (const key of FILTER_KEYS) clean[key] = undefined;
    update({ ...clean, category: undefined, cname: undefined, seller: undefined });
  }

  return (
    <div className="container-fluid p-587 my-3">
      <div className="row py-2 heading">
        <div className="col-12 col-md-6">
          <h4>
            {typeLabel ?? title}
            {data && (
              <small className="text-muted ml-2">
                {data.count} {data.count === 1 ? "result" : "results"}
              </small>
            )}
          </h4>
        </div>
        <div className="col-12 col-md-6 text-md-right">
          <label className="mb-0">
            Sort by{" "}
            <select
              className="form-control form-control-sm d-inline-block w-auto"
              aria-label="Sort"
              value={get("ordering") || "newest"}
              onChange={(event) => update({ ordering: event.target.value === "newest" ? undefined : event.target.value })}
            >
              {ORDERING.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-2">
        {category && (
          <span className="badge badge-success mr-2 p-2">
            Category: {get("cname") || `#${category}`}{" "}
            <a className="csp text-white" role="button" onClick={() => update({ category: undefined, cname: undefined })}>
              ✕
            </a>
          </span>
        )}
        {seller && (
          <span className="badge badge-success mr-2 p-2">
            Seller: {sellerName ?? `#${seller}`}{" "}
            <a className="csp text-white" role="button" onClick={() => update({ seller: undefined })}>
              ✕
            </a>
          </span>
        )}
        <Link href={SHOP.categories} className="small">
          Browse categories
        </Link>
      </div>

      <div className="row">
        <div className="col-lg-3">
          <Filters
            key={query}
            kind={kind}
            presetType={presetType}
            get={get}
            onApply={apply}
            onClear={clear}
            error={filterError}
          />
        </div>
        <div className="col-lg-9">
          {error && (
            <p className="text-danger" role="alert">
              {error}
            </p>
          )}
          {loading && !data ? (
            <p className="text-muted py-5 text-center">Loading…</p>
          ) : pastEnd ? (
            <div className="text-center py-5" data-testid="past-end">
              <p className="text-muted">There are no more {title.toLowerCase()} to show.</p>
              <button type="button" className="btn btn-success btn-sm" onClick={() => update({ page: undefined })}>
                Back to the first page
              </button>
            </div>
          ) : !loading && !error && rows.length === 0 && !filterError ? (
            <p className="text-muted py-5 text-center">
              {anyFilter ? "Nothing matches these filters." : `There are no ${title.toLowerCase()} to show yet.`}
            </p>
          ) : (
            <div className="product_wrap" style={{ opacity: loading ? 0.5 : 1 }} aria-busy={loading}>
              <div className="row justify-content-start">
                {rows.map((row) =>
                  kind === "product" ? (
                    <ProductCard key={row.id} product={row as ProductRow} />
                  ) : (
                    <GigCard key={row.id} gig={row as GigRow} />
                  ),
                )}
              </div>
            </div>
          )}
          {data && (
            <Pager
              page={data.page}
              totalPages={data.total_pages}
              onPage={(n) => {
                update({ page: n > 1 ? String(n) : undefined });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
