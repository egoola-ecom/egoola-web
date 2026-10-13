"use client";

import { useEffect, useState } from "react";
import { getSeller, listSellers } from "@/lib/accounts-api";
import styles from "../../management.module.css";

export type ListingOwnerKind = "none" | "seller";

interface OwnerOption {
  id: number;
  name: string;
  email: string;
}

interface ResolvedOwner {
  kind: ListingOwnerKind;
  id: number;
  name: string;
}

/** Optional owner of a product listing or a gig: nobody (an Admin-owned
 * entry) or a seller. (A buyer owns only a job request, which is not made
 * here.) Searches the seller list by name as the admin types and shows who is
 * currently picked. */
export function ListingOwnerPicker({
  kind,
  ownerId,
  onChange,
  noneLabel = "No owner (admin listing)",
}: {
  kind: ListingOwnerKind;
  ownerId: number | null;
  onChange: (kind: ListingOwnerKind, ownerId: number | null) => void;
  noneLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<OwnerOption[]>([]);
  const [resolved, setResolved] = useState<ResolvedOwner | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Search results for whichever kind is active.
  useEffect(() => {
    if (kind === "none") return;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "10" });
    if (debouncedQuery) params.set("search", debouncedQuery);
    listSellers(params)
      .then((res) => {
        if (!cancelled) setOptions(res.results.map(({ id, name, email }) => ({ id, name, email })));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, debouncedQuery]);

  // The picked owner's name — needed on the edit page, where only an id is
  // known up front.
  useEffect(() => {
    if (kind === "none" || ownerId == null) return;
    let cancelled = false;
    getSeller(ownerId)
      .then((owner) => {
        if (!cancelled) setResolved({ kind, id: ownerId, name: owner.name });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [kind, ownerId]);

  const selectedName =
    resolved && resolved.kind === kind && resolved.id === ownerId ? resolved.name : null;

  function pickKind(next: ListingOwnerKind) {
    if (next === kind) return;
    setQuery("");
    setDebouncedQuery("");
    setOptions([]);
    onChange(next, null);
  }

  return (
    <div className={styles.ownerPicker}>
      <span className={styles.label}>Owner</span>
      <div className={styles.ownerKindRow}>
        {(
          [
            ["none", noneLabel],
            ["seller", "Seller"],
          ] as const
        ).map(([value, text]) => (
          <label key={value}>
            <input
              type="radio"
              name="listing-owner-kind"
              checked={kind === value}
              onChange={() => pickKind(value)}
            />
            {text}
          </label>
        ))}
      </div>

      {kind !== "none" && (
        <>
          <input
            id="listing-owner-search"
            type="search"
            className={styles.input}
            aria-label={`Search ${kind}s`}
            placeholder={`Search ${kind}s by name…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={styles.treeBox}>
            {options.length === 0 ? (
              <div className={styles.treeEmpty}>No {kind}s found.</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.id}
                  className={`${styles.treeRow} ${option.id === ownerId ? styles.treeRowSelected : ""}`}
                  onClick={() => {
                    setResolved({ kind, id: option.id, name: option.name });
                    onChange(kind, option.id);
                  }}
                >
                  <span>{option.name}</span>
                  <span className={styles.secondaryText}>{option.email}</span>
                </div>
              ))
            )}
          </div>
          <p className={styles.fieldHint}>
            Selected:{" "}
            {ownerId == null ? `no ${kind} picked yet` : (selectedName ?? `${kind} #${ownerId}`)}
          </p>
        </>
      )}
    </div>
  );
}
