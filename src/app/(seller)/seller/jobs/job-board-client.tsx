"use client";

import { useEffect, useMemo, useState } from "react";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { GeographyFields } from "@/app/(admin)/admin/(protected)/_shared/geography-fields";
import { PRICE_TYPE_OPTIONS } from "@/app/(admin)/admin/(protected)/gigs/gig-utils";
import { publicGeographyLoaders } from "@/lib/geography-api";
import { SellerJobCard, listBoardJobs } from "@/lib/seller-job-api";
import { SellerLookupCategory, listSellerCategories } from "@/lib/seller-listing-api";
import { useCursorList } from "@/lib/use-cursor-list";
import { useDebounced } from "@/lib/use-debounced";
import { useGeographySelection } from "@/lib/use-geography-selection";
import shell from "../../seller-shell.module.css";
import { useListingFailure } from "../listings/listing-status";
import { JobTable } from "./job-card";
import { LoadMore } from "./load-more";

/** The job board: every job open for bids, newest first, narrowed by the
 * filters. Cursor paged ("Load more"). */
export function JobBoardClient() {
  const fail = useListingFailure();
  const geo = useGeographySelection({}, publicGeographyLoaders);

  const [category, setCategory] = useState("");
  const [priceType, setPriceType] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deliveryMax, setDeliveryMax] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [more, setMore] = useState(false);
  const [categories, setCategories] = useState<SellerLookupCategory[]>([]);

  useEffect(() => {
    listSellerCategories("service")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Typed numbers wait a moment so each keystroke is not a request.
  const filterKey = useDebounced(
    JSON.stringify({
      category,
      price_type: priceType,
      budget_min: budgetMin.trim(),
      budget_max: budgetMax.trim(),
      delivery_days_max: deliveryMax.trim(),
      urgent: urgent ? "true" : "",
      created_from: createdFrom,
      created_to: createdTo,
      requested_from: requestedFrom,
      requested_to: requestedTo,
      country: geo.countryId != null ? String(geo.countryId) : "",
      state: geo.stateId != null ? String(geo.stateId) : "",
      city: geo.cityId != null ? String(geo.cityId) : "",
      thana: geo.thanaId != null ? String(geo.thanaId) : "",
    }),
    300,
  );
  const filters = useMemo(() => JSON.parse(filterKey) as Record<string, string>, [filterKey]);

  const { items, loading, loadingMore, error, hasMore, loadMore } = useCursorList<SellerJobCard>(
    listBoardJobs,
    "",
    filters,
    20,
    fail,
  );

  const anyFilter = Object.values(filters).some(Boolean);

  function clear() {
    setCategory("");
    setPriceType("");
    setBudgetMin("");
    setBudgetMax("");
    setDeliveryMax("");
    setUrgent(false);
    setCreatedFrom("");
    setCreatedTo("");
    setRequestedFrom("");
    setRequestedTo("");
    geo.selectCountry(null);
  }

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={shell.pageTitle}>Job board</h1>
          <p className={shell.pageText} style={{ marginBottom: 0 }}>
            Jobs buyers have posted and are taking bids on. Open one and place your own price.
          </p>
        </div>
      </div>

      <div className={management.toolbar}>
        <div className={management.toolbarLeft}>
          <select
            className={management.filterSelect}
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <select
            className={management.filterSelect}
            aria-label="Filter by price type"
            value={priceType}
            onChange={(event) => setPriceType(event.target.value)}
          >
            <option value="">All price types</option>
            <option value="fixed">Fixed price</option>
            {PRICE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            className={management.filterSelect}
            type="number"
            min="0"
            aria-label="Lowest budget"
            placeholder="Budget from ৳"
            value={budgetMin}
            onChange={(event) => setBudgetMin(event.target.value)}
          />
          <input
            className={management.filterSelect}
            type="number"
            min="0"
            aria-label="Highest budget"
            placeholder="Budget to ৳"
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
          />
          <label className={management.secondaryText}>
            <input
              type="checkbox"
              checked={urgent}
              onChange={(event) => setUrgent(event.target.checked)}
            />{" "}
            Urgent only
          </label>
          <button
            type="button"
            className={management.actionButton}
            aria-expanded={more}
            onClick={() => setMore(!more)}
          >
            {more ? "Fewer filters" : "More filters"}
          </button>
          {anyFilter && (
            <button type="button" className={management.actionButton} onClick={clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {more && (
        <div className={management.detailCard}>
          <div className={management.formGrid}>
            <div className={management.field}>
              <label className={management.label} htmlFor="board-delivery">
                Delivery within (days)
              </label>
              <input
                id="board-delivery"
                className={management.input}
                type="number"
                min="1"
                value={deliveryMax}
                onChange={(event) => setDeliveryMax(event.target.value)}
              />
            </div>
            {(
              [
                ["Posted from", createdFrom, setCreatedFrom],
                ["Posted to", createdTo, setCreatedTo],
                ["Needed from", requestedFrom, setRequestedFrom],
                ["Needed to", requestedTo, setRequestedTo],
              ] as const
            ).map(([label, value, setValue]) => (
              <div key={label} className={management.field}>
                <label className={management.label}>
                  {label}
                  <input
                    type="date"
                    className={management.input}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                  />
                </label>
              </div>
            ))}
            <div className={management.formGridFull}>
              <GeographyFields geo={geo} idPrefix="board-geo" />
            </div>
          </div>
        </div>
      )}

      {error && <p className={management.errorBanner}>{error}</p>}

      <JobTable
        jobs={items}
        loading={loading}
        showStatus={false}
        emptyText={anyFilter ? "No open jobs match these filters." : "No jobs are open for bids right now."}
      />
      <LoadMore shown={items.length} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
    </div>
  );
}
