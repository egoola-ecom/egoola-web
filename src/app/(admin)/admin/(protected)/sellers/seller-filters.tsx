"use client";

import { useEffect, useState } from "react";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { GeographyFields } from "../_shared/geography-fields";
import styles from "../management.module.css";

/** Search waits for a short pause in typing before it asks the server. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Every filter the seller list and the Seller Request queue share. The same
 * hook drives both screens, so a filter means the same thing on each.
 * `filters` is ready to pass to the list hook; `search` is the debounced text.
 */
export function useSellerFilters() {
  const [searchText, setSearchText] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [status, setStatus] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [hasBusinessProfile, setHasBusinessProfile] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const geo = useGeographySelection({});

  const search = useDebounced(searchText.trim(), 300);
  const businessTypeQuery = useDebounced(businessType.trim(), 300);

  const filters: Record<string, string | undefined> = {
    verification_status: verificationStatus,
    status,
    creator_type: creatorType,
    has_business_profile: hasBusinessProfile,
    business_type: businessTypeQuery,
    created_from: createdFrom,
    created_to: createdTo,
    requested_from: requestedFrom,
    requested_to: requestedTo,
    country: geo.countryId != null ? String(geo.countryId) : undefined,
    state: geo.stateId != null ? String(geo.stateId) : undefined,
    city: geo.cityId != null ? String(geo.cityId) : undefined,
    thana: geo.thanaId != null ? String(geo.thanaId) : undefined,
  };

  const active = Boolean(
    searchText ||
      verificationStatus ||
      status ||
      creatorType ||
      hasBusinessProfile ||
      businessType ||
      createdFrom ||
      createdTo ||
      requestedFrom ||
      requestedTo ||
      geo.countryId != null,
  );

  function clear() {
    setSearchText("");
    setVerificationStatus("");
    setStatus("");
    setCreatorType("");
    setHasBusinessProfile("");
    setBusinessType("");
    setCreatedFrom("");
    setCreatedTo("");
    setRequestedFrom("");
    setRequestedTo("");
    geo.selectCountry(null);
  }

  return {
    searchText,
    setSearchText,
    search,
    verificationStatus,
    setVerificationStatus,
    status,
    setStatus,
    creatorType,
    setCreatorType,
    hasBusinessProfile,
    setHasBusinessProfile,
    businessType,
    setBusinessType,
    createdFrom,
    setCreatedFrom,
    createdTo,
    setCreatedTo,
    requestedFrom,
    setRequestedFrom,
    requestedTo,
    setRequestedTo,
    geo,
    filters,
    active,
    clear,
  };
}

export type SellerFilterState = ReturnType<typeof useSellerFilters>;

/** The filter controls. `idPrefix` keeps ids unique; `showCreatorType` is off
 * in the request queue, where every row was self-registered anyway. */
export function SellerFilterBar({
  f,
  idPrefix,
  showCreatorType,
  dateKind,
  trailing,
}: {
  f: SellerFilterState;
  idPrefix: string;
  showCreatorType: boolean;
  /** Which date the range filters: when the seller signed up (the list) or
   * when they joined the queue — sign-up or latest resubmit (the queue). */
  dateKind: "signup" | "requested";
  /** Extra controls on the first row (for example the sort or an Add button). */
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search sellers"
            placeholder="Search by name, email, or phone"
            value={f.searchText}
            onChange={(event) => f.setSearchText(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by verification status"
            value={f.verificationStatus}
            onChange={(event) => f.setVerificationStatus(event.target.value)}
          >
            <option value="">All verification statuses</option>
            <option value="unverified">Unverified</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by account status"
            value={f.status}
            onChange={(event) => f.setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          {showCreatorType && (
            <select
              className={styles.filterSelect}
              aria-label="Filter by who created the account"
              value={f.creatorType}
              onChange={(event) => f.setCreatorType(event.target.value)}
            >
              <option value="">Self-registered and admin-created</option>
              <option value="seller">Self-registered</option>
              <option value="admin">Created by an admin</option>
            </select>
          )}
          <select
            className={styles.filterSelect}
            aria-label="Filter by business profile"
            value={f.hasBusinessProfile}
            onChange={(event) => f.setHasBusinessProfile(event.target.value)}
          >
            <option value="">Business profile: any</option>
            <option value="true">Has a business profile</option>
            <option value="false">No business profile</option>
          </select>
        </div>
        {trailing}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            id={`${idPrefix}-business-type`}
            className={styles.searchInput}
            type="search"
            aria-label="Filter by business type"
            placeholder="Business type (e.g. Retail)"
            value={f.businessType}
            onChange={(event) => f.setBusinessType(event.target.value)}
          />
          <label className={styles.secondaryText} htmlFor={`${idPrefix}-date-from`}>
            {dateKind === "requested" ? "Requested from" : "Signed up from"}
          </label>
          <input
            id={`${idPrefix}-date-from`}
            type="date"
            className={styles.filterSelect}
            value={dateKind === "requested" ? f.requestedFrom : f.createdFrom}
            max={(dateKind === "requested" ? f.requestedTo : f.createdTo) || undefined}
            onChange={(event) =>
              dateKind === "requested"
                ? f.setRequestedFrom(event.target.value)
                : f.setCreatedFrom(event.target.value)
            }
          />
          <label className={styles.secondaryText} htmlFor={`${idPrefix}-date-to`}>
            to
          </label>
          <input
            id={`${idPrefix}-date-to`}
            type="date"
            className={styles.filterSelect}
            value={dateKind === "requested" ? f.requestedTo : f.createdTo}
            min={(dateKind === "requested" ? f.requestedFrom : f.createdFrom) || undefined}
            onChange={(event) =>
              dateKind === "requested"
                ? f.setRequestedTo(event.target.value)
                : f.setCreatedTo(event.target.value)
            }
          />
          {f.active && (
            <button type="button" className={styles.actionButton} onClick={f.clear}>
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <GeographyFields geo={f.geo} idPrefix={`${idPrefix}-geo`} />
      </div>
    </>
  );
}
