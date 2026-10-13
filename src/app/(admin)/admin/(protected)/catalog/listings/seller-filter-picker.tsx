"use client";

import { useEffect, useState } from "react";
import { getSeller, listSellers } from "@/lib/accounts-api";
import styles from "../../management.module.css";

interface Option {
  id: number;
  name: string;
  email: string;
}

/** A search box that narrows a list to one seller: type a name, pick the
 * match. Shows who is picked, with a button to clear it. */
export function SellerFilterPicker({
  value,
  onChange,
}: {
  /** The picked seller's id as text, "" for everyone. */
  value: string;
  onChange: (sellerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "8" });
    if (debounced) params.set("search", debounced);
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
  }, [open, debounced]);

  // A seller picked earlier (or from a link) is known only by id.
  useEffect(() => {
    if (!value || pickedName) return;
    let cancelled = false;
    getSeller(Number(value))
      .then((seller) => {
        if (!cancelled) setPickedName(seller.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, pickedName]);

  if (value) {
    return (
      <span className={styles.secondaryText}>
        Seller: <strong>{pickedName ?? `#${value}`}</strong>{" "}
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => {
            setPickedName(null);
            setQuery("");
            onChange("");
          }}
        >
          Clear
        </button>
      </span>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        className={styles.searchInput}
        type="search"
        aria-label="Filter by seller"
        placeholder="Filter by seller name…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div
          className={styles.treeBox}
          style={{ position: "absolute", zIndex: 5, minWidth: "16rem", background: "#fff" }}
        >
          {options.length === 0 ? (
            <div className={styles.treeEmpty}>No sellers found.</div>
          ) : (
            options.map((option) => (
              <div
                key={option.id}
                className={styles.treeRow}
                onClick={() => {
                  setPickedName(option.name);
                  setOpen(false);
                  onChange(String(option.id));
                }}
              >
                <span>{option.name}</span>
                <span className={styles.secondaryText}>{option.email}</span>
              </div>
            ))
          )}
          <div className={styles.treeRow} onClick={() => setOpen(false)}>
            <span className={styles.secondaryText}>Close</span>
          </div>
        </div>
      )}
    </div>
  );
}
