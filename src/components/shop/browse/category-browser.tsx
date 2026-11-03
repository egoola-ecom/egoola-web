"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listCategories, resolveCategoryChain } from "@/lib/buyer/public-categories-api";
import { filterErrorText, isNotFound } from "@/lib/buyer/public-fetch";
import type { CategoryType, PageResult, PublicCategory } from "@/lib/buyer/types";
import { resolveMediaUrl } from "@/lib/env";
import { SHOP } from "../shop-links";
import { Pager } from "./pager";

const PAGE_SIZE = 24;

/** Where a category's listings are: products for a product category, gigs for
 * a service one. The listing includes every sub-category below it. */
export function listingsHref(category: PublicCategory): string {
  const base = category.type === "product" ? SHOP.products : SHOP.services;
  return `${base}?category=${category.id}&cname=${encodeURIComponent(category.name)}`;
}

/** The category drill-down. At the top (`parentId` null) it shows the first
 * level and searches every level; inside a category it shows that category's
 * direct children and searches only them. A tap on a category with children
 * goes one level deeper; a tap on a leaf goes to its listings. */
export function CategoryBrowser({ parentId, trail }: { parentId: number | null; trail: number[] }) {
  const router = useRouter();
  const [type, setType] = useState<CategoryType | "">("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<PublicCategory> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState<PublicCategory[]>([]);
  const generation = useRef(0);

  // The search waits a moment after typing; a new search starts at page 1.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchText]);

  const trailKey = trail.join(",");

  // Names of the ancestors and of this category, for the breadcrumb.
  useEffect(() => {
    if (parentId == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChain([]);
      return;
    }
    let cancelled = false;
    resolveCategoryChain([...(trailKey ? trailKey.split(",").map(Number) : []), parentId])
      .then((found) => {
        if (!cancelled) setChain(found);
      })
      .catch(() => {
        if (!cancelled) setChain([]);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, trailKey]);

  useEffect(() => {
    const mine = ++generation.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    listCategories({
      parent_id: parentId ?? undefined,
      search: search || undefined,
      type: type || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((res) => {
        if (generation.current === mine) setData(res);
      })
      .catch((err) => {
        if (generation.current !== mine) return;
        setData(null);
        setError(
          isNotFound(err)
            ? "This category was not found."
            : err?.status === 400
              ? filterErrorText(err)
              : "We couldn't load the categories. Please try again.",
        );
      })
      .finally(() => {
        if (generation.current === mine) setLoading(false);
      });
  }, [parentId, search, type, page]);

  // The trail of a child is this category's trail plus this category.
  const childTrail = parentId == null ? [] : [...trail, parentId];
  const current = chain.length > 0 && chain[chain.length - 1].id === parentId ? chain[chain.length - 1] : null;
  const rows = data?.results ?? [];
  // A category with no children has been reached: its listings are next.
  const leafReached = parentId != null && !loading && !error && data?.count === 0 && !search && !type;

  function open(category: PublicCategory) {
    router.push(category.has_children ? SHOP.category(category.id, childTrail) : listingsHref(category));
  }

  return (
    <div className="container-fluid p-587 my-3">
      <nav aria-label="Breadcrumb" className="small mb-2">
        <Link href={SHOP.categories}>All categories</Link>
        {chain.map((c, i) => (
          <span key={c.id}>
            {" / "}
            {i === chain.length - 1 ? (
              <strong>{c.name}</strong>
            ) : (
              <Link href={SHOP.category(c.id, chain.slice(0, i).map((x) => x.id))}>{c.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="row py-2 heading">
        <div className="col-12 col-md-6">
          <h4>{current ? current.name : "Categories"}</h4>
        </div>
        <div className="col-12 col-md-6">
          <input
            className="form-control"
            type="search"
            aria-label="Search categories"
            placeholder={parentId == null ? "Search every category" : `Search in ${current?.name ?? "this category"}`}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      {parentId == null ? (
        <div className="mb-3" role="group" aria-label="Kind">
          {(
            [
              ["", "All"],
              ["product", "Products"],
              ["service", "Services"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm mr-2 ${type === value ? "btn-success" : "btn-light border"}`}
              aria-pressed={type === value}
              onClick={() => {
                setType(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        current && (
          <p className="mb-3">
            <Link href={listingsHref(current)} className="btn btn-success btn-sm">
              See everything in {current.name}
            </Link>
          </p>
        )
      )}

      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}

      {loading && !data ? (
        <p className="text-muted py-5 text-center">Loading…</p>
      ) : leafReached ? (
        <div className="text-center py-5">
          <p className="text-muted">{current?.name ?? "This category"} has no sub-categories. Its listings are next.</p>
          {current && (
            <Link href={listingsHref(current)} className="btn btn-success">
              See {current.type === "product" ? "products" : "services"}
            </Link>
          )}
        </div>
      ) : !loading && !error && rows.length === 0 ? (
        <p className="text-muted py-5 text-center">
          {search ? `No category matches "${search}".` : "No categories to show."}
        </p>
      ) : (
        <div className="row" style={{ opacity: loading ? 0.5 : 1 }} aria-busy={loading}>
          {rows.map((category) => (
            <div key={category.id} className="col-6 col-md-4 col-lg-3 mb-3">
              <button
                type="button"
                className="btn btn-light border w-100 text-left d-flex align-items-center p-3"
                onClick={() => open(category)}
              >
                {category.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(category.image_url) ?? undefined} width={32} height={32} alt="" className="mr-2" />
                )}
                <span className="flex-grow-1">
                  <strong className="d-block">{category.name}</strong>
                  {category.name_bn && <small className="text-muted d-block">{category.name_bn}</small>}
                  {parentId == null && !search && (
                    <small className="text-muted">{category.type === "product" ? "Products" : "Services"}</small>
                  )}
                  {search && (
                    <small className="text-muted">{category.type === "product" ? "Products" : "Services"}</small>
                  )}
                </span>
                {category.has_children && <i className="fas fa-angle-right ml-2" aria-label="Has sub-categories" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {data && <Pager page={data.page} totalPages={data.total_pages} onPage={setPage} />}
    </div>
  );
}
