"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listFavourites, type Favourite, type FavouriteType } from "@/lib/buyer/favourites-api";
import { cartErrorText, isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { isInvalidPage } from "@/lib/buyer/public-fetch";
import type { PageResult } from "@/lib/buyer/types";
import { GigCard } from "../gig-card";
import { SHOP } from "../shop-links";
import { Pager } from "./pager";
import { ProductCard } from "./product-card";
import { useQueryParams } from "./use-query-params";

const PAGE_SIZE = 12;

export function FavouritesScreen() {
  const router = useRouter();
  const { get, update } = useQueryParams();
  const typeParam = get("type");
  const type: FavouriteType | undefined = typeParam === "product" || typeParam === "service" ? typeParam : undefined;
  const page = Math.max(1, Number(get("page")) || 1);

  const [data, setData] = useState<PageResult<Favourite> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastEnd, setPastEnd] = useState(false);
  // Whether the buyer has any favourite at all, to tell "never saved anything"
  // apart from "nothing of this type".
  const [anyEver, setAnyEver] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    setPastEnd(false);
    listFavourites({ type, page, page_size: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (!type) setAnyEver(result.count > 0);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname + window.location.search));
        else if (isInvalidPage(err)) {
          // A page past the last one: say so instead of showing the 404.
          setPastEnd(true);
        } else setError(cartErrorText(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page]);

  const tab = (value: FavouriteType | undefined, label: string) => (
    <li className="nav-item">
      <button type="button" className={`nav-link ${type === value ? "active" : ""}`} onClick={() => update({ type: value })}>
        {label}
      </button>
    </li>
  );

  return (
    <div className="container-fluid p-587 my-3">
      <h4 className="mb-3">My favourites</h4>
      <ul className="nav nav-tabs mb-3">
        {tab(undefined, "All")}
        {tab("product", "Products")}
        {tab("service", "Services")}
      </ul>

      {error ? (
        <p className="text-danger text-center py-5">{error}</p>
      ) : pastEnd ? (
        <div className="text-center py-5" data-testid="past-end">
          <p className="text-muted">There are no more favourites to show.</p>
          <button type="button" className="btn btn-success btn-sm" onClick={() => update({ page: undefined })}>
            Back to the first page
          </button>
        </div>
      ) : !data ? (
        <p className="text-muted text-center py-5">Loading…</p>
      ) : data.count === 0 ? (
        <div className="bg-white text-center p-5" data-testid="fav-empty">
          {type && anyEver !== false ? (
            <>
              <h5>No {type === "product" ? "products" : "services"} saved</h5>
              <p className="text-muted mb-0">Nothing of this kind in your favourites. Try the other tabs.</p>
            </>
          ) : (
            <>
              <h5>You haven&apos;t saved anything yet</h5>
              <p className="text-muted">Tap the heart on a product or service to keep it here.</p>
              <Link className="btn btn-success" href={SHOP.products}>
                Browse products
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted small">
            {data.count} saved. A listing that is taken off sale hides here and comes back by itself when it is visible again.
          </p>
          <div className="row justify-content-start" data-testid="fav-list">
            {data.results.map((fav) =>
              fav.catalog_type === "product" ? (
                <ProductCard key={fav.id} product={fav.listing} />
              ) : (
                <GigCard key={fav.id} gig={fav.listing} />
              ),
            )}
          </div>
          <Pager page={data.page} totalPages={data.total_pages} onPage={(next) => update({ page: String(next) })} />
        </>
      )}
    </div>
  );
}
