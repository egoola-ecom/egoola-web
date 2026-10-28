"use client";

import { useEffect, useState } from "react";
import { getBuyer, getSeller, listBuyers, listSellers } from "@/lib/accounts-api";
import { useDebounced } from "@/lib/use-debounced";
import styles from "../management.module.css";

interface Option {
  id: number;
  name: string;
  detail: string;
}

async function search(kind: "buyer" | "seller", text: string): Promise<Option[]> {
  const params = new URLSearchParams({ limit: "8" });
  if (text) params.set("search", text);
  if (kind === "buyer") {
    const res = await listBuyers(params);
    return res.results.map((b) => ({ id: b.id, name: b.name, detail: b.email }));
  }
  const res = await listSellers(params);
  return res.results.map((s) => ({ id: s.id, name: s.name, detail: s.phone }));
}

async function nameOf(kind: "buyer" | "seller", id: number): Promise<string> {
  return kind === "buyer" ? (await getBuyer(id)).name : (await getSeller(id)).name;
}

/** Pick one buyer or seller by typing a name, email or phone. Used where a
 * form acts on someone's behalf (a job for a buyer, a bid for a seller). The
 * picked person is shown with a Change button. `error` goes under the box. */
export function PersonPicker({
  kind,
  value,
  onChange,
  label,
  error,
  inputId,
  disabled = false,
}: {
  kind: "buyer" | "seller";
  value: number | null;
  onChange: (id: number | null) => void;
  label: string;
  error?: string | null;
  inputId: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    search(kind, debounced)
      .then((found) => {
        if (!cancelled) setOptions(found);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, open, debounced]);

  // A person set from a link or a saved record is known only by id.
  useEffect(() => {
    if (value == null || names[value]) return;
    let cancelled = false;
    nameOf(kind, value)
      .then((name) => {
        if (!cancelled) setNames((prev) => ({ ...prev, [value]: name }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [kind, value, names]);

  return (
    <div className={styles.field} style={{ position: "relative" }}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      {value != null ? (
        <p className={styles.readonlyValue}>
          <strong>{names[value] ?? `#${value}`}</strong>{" "}
          {!disabled && (
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => {
                setQuery("");
                onChange(null);
              }}
            >
              Change
            </button>
          )}
        </p>
      ) : (
        <>
          <input
            id={inputId}
            className={styles.input}
            type="search"
            autoComplete="off"
            placeholder={kind === "buyer" ? "Search a buyer by name, email or phone…" : "Search a seller by name, email or phone…"}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
          />
          {open && (
            <div className={styles.treeBox} style={{ background: "#fff" }}>
              {options.length === 0 ? (
                <div className={styles.treeEmpty}>No {kind}s found.</div>
              ) : (
                options.map((option) => (
                  <div
                    key={option.id}
                    className={styles.treeRow}
                    onClick={() => {
                      setNames((prev) => ({ ...prev, [option.id]: option.name }));
                      setOpen(false);
                      onChange(option.id);
                    }}
                  >
                    <span>{option.name}</span>
                    <span className={styles.secondaryText}>{option.detail}</span>
                  </div>
                ))
              )}
              <div className={styles.treeRow} onClick={() => setOpen(false)}>
                <span className={styles.secondaryText}>Close</span>
              </div>
            </div>
          )}
        </>
      )}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}
