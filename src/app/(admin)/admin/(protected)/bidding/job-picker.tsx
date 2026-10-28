"use client";

import { useEffect, useState } from "react";
import { getJob, listJobs } from "@/lib/admin-jobs-api";
import { useDebounced } from "@/lib/use-debounced";
import styles from "../management.module.css";

interface Option {
  id: number;
  title: string;
  buyer: string;
}

/** Pick the job a bid is for. Only jobs open for bidding are offered, but the
 * server has the last word (a job id from a link is accepted as it is). */
export function JobPicker({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [titles, setTitles] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "8", status: "open_for_bidding" });
    if (debounced) params.set("search", debounced);
    listJobs(params)
      .then((res) => {
        if (!cancelled) {
          setOptions(res.results.map((j) => ({ id: j.id, title: j.title, buyer: j.buyer.name })));
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  useEffect(() => {
    if (value == null || titles[value]) return;
    let cancelled = false;
    getJob(value)
      .then((job) => {
        if (!cancelled) setTitles((prev) => ({ ...prev, [value]: `${job.title} (${job.status})` }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, titles]);

  return (
    <div className={styles.field} style={{ position: "relative" }}>
      <label className={styles.label} htmlFor="bid-job">
        Job
      </label>
      {value != null ? (
        <p className={styles.readonlyValue}>
          <strong>{titles[value] ?? `#${value}`}</strong>{" "}
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
            id="bid-job"
            className={styles.input}
            type="search"
            autoComplete="off"
            placeholder="Search an open job by title or buyer…"
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
                <div className={styles.treeEmpty}>No open jobs found.</div>
              ) : (
                options.map((option) => (
                  <div
                    key={option.id}
                    className={styles.treeRow}
                    onClick={() => {
                      setTitles((prev) => ({ ...prev, [option.id]: option.title }));
                      setOpen(false);
                      onChange(option.id);
                    }}
                  >
                    <span>{option.title}</span>
                    <span className={styles.secondaryText}>{option.buyer}</span>
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
