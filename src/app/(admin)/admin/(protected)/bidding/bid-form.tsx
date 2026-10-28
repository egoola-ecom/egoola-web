"use client";

import { useState } from "react";
import { BidDetail, BidInput } from "@/lib/admin-bids-api";
import { FieldErrors } from "@/lib/use-managed-list";
import { fromLocalInput, toLocalInput } from "../_shared/datetime";
import { PersonPicker } from "../_shared/person-picker";
import { TierBuilder } from "../_shared/tier-builder";
import {
  TierProblems,
  TierRow,
  buildTierPayload,
  hasTierProblems,
  tiersFromSaved,
  validateTiers,
} from "../_shared/tier-model";
import { JobPicker } from "./job-picker";
import styles from "../management.module.css";

const PLACED_ERROR_KEYS = new Set([
  "listing",
  "bidder",
  "description",
  "proposed_start",
  "proposed_end",
]);

function unplacedErrors(fieldErrors: FieldErrors): string[] {
  return Object.entries(fieldErrors)
    .filter(([key]) => !PLACED_ERROR_KEYS.has(key) && !key.startsWith("price_tiers."))
    .flatMap(([key, messages]) =>
      (messages ?? []).map((message) => (key === "detail" ? message : `${key}: ${message}`)),
    );
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return new Date(a).getTime() === new Date(b).getTime();
}

/** A bid on a seller's behalf. Create needs a job and a seller and at least
 * one price option; edit (only while the bid is pending) sends what changed.
 * The job and the seller never change after create. */
export function BidForm({
  mode,
  initial,
  initialJob,
  initialSeller,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: BidDetail | null;
  initialJob?: number | null;
  initialSeller?: number | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: Partial<BidInput> & { listing?: number; bidder?: number }) => void;
}) {
  const [jobId, setJobId] = useState<number | null>(initialJob ?? null);
  const [sellerId, setSellerId] = useState<number | null>(initialSeller ?? null);
  const [tiers, setTiers] = useState<TierRow[]>(() => tiersFromSaved(initial?.price_tiers));
  const [sentRowKeys, setSentRowKeys] = useState<string[]>([]);
  const [problems, setProblems] = useState<TierProblems | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setJobError(null);
    setSellerError(null);

    if (mode === "create") {
      if (jobId == null) setJobError("Say which job this bid is for.");
      if (sellerId == null) setSellerError("Say which seller this bid is for.");
      if (jobId == null || sellerId == null) {
        setLocalError("Pick the job and the seller.");
        return;
      }
    }
    const found = validateTiers(tiers, { withDuration: true, requireOne: true, noun: "price option" });
    setProblems(found);
    if (hasTierProblems(found)) {
      setLocalError("Fix the price options marked below, then save again.");
      return;
    }
    const built = buildTierPayload(tiers, mode, true);
    setSentRowKeys(built.rowKeys);

    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim() || null;
    const start = fromLocalInput(String(data.get("proposed_start") ?? ""));
    const end = fromLocalInput(String(data.get("proposed_end") ?? ""));
    const price_tiers = built.items as BidInput["price_tiers"] | undefined;

    if (mode === "create") {
      onSubmit({
        listing: jobId as number,
        bidder: sellerId as number,
        description,
        proposed_start: start,
        proposed_end: end,
        price_tiers,
      });
      return;
    }
    const input: Partial<BidInput> = {};
    if ((description ?? "") !== (initial?.description ?? "")) input.description = description;
    if (!sameInstant(start, initial?.proposed_start)) input.proposed_start = start;
    if (!sameInstant(end, initial?.proposed_end)) input.proposed_end = end;
    if (price_tiers) input.price_tiers = price_tiers;
    if (Object.keys(input).length === 0) {
      setLocalError("Nothing has changed.");
      return;
    }
    onSubmit(input);
  }

  function err(key: string) {
    return fieldErrors[key]?.[0] ? <p className={styles.fieldError}>{fieldErrors[key]?.[0]}</p> : null;
  }

  return (
    <form onSubmit={handleSubmit}>
      {(localError || formError) && <p className={styles.errorBanner}>{localError ?? formError}</p>}
      {unplacedErrors(fieldErrors).map((message) => (
        <p key={message} className={styles.errorBanner}>
          {message}
        </p>
      ))}

      <div className={styles.formGrid}>
        <p className={styles.sectionDivider} style={{ borderTop: "none", paddingTop: 0 }}>
          Who and what
        </p>
        <div className={styles.formGridFull}>
          {mode === "create" ? (
            <>
              <JobPicker
                value={jobId}
                onChange={(id) => {
                  setJobId(id);
                  setJobError(null);
                }}
                error={jobError ?? fieldErrors.listing?.[0]}
              />
              <PersonPicker
                kind="seller"
                inputId="bid-seller"
                label="Seller (the bid is placed on their behalf)"
                value={sellerId}
                onChange={(id) => {
                  setSellerId(id);
                  setSellerError(null);
                }}
                error={sellerError ?? fieldErrors.bidder?.[0]}
              />
            </>
          ) : (
            <p className={styles.fieldHint}>
              The job and the seller cannot be changed. Cancel this bid and place a new one instead.
            </p>
          )}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="bid-description">
            Message to the buyer (optional)
          </label>
          <textarea
            id="bid-description"
            name="description"
            className={styles.textarea}
            defaultValue={initial?.description ?? ""}
          />
          {err("description")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bid-start">
            Proposed start
          </label>
          <input
            id="bid-start"
            name="proposed_start"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.proposed_start)}
          />
          {err("proposed_start")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bid-end">
            Proposed end
          </label>
          <input
            id="bid-end"
            name="proposed_end"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.proposed_end)}
          />
          {err("proposed_end")}
        </div>

        <p className={styles.sectionDivider}>Price options</p>
        <div className={styles.formGridFull}>
          <p className={styles.fieldHint}>
            The buyer picks one option when hiring. The total is the price times the duration;
            a fixed price always counts as one.
          </p>
          <TierBuilder
            rows={tiers}
            onChange={setTiers}
            withDuration
            listKey="price_tiers"
            fieldErrors={fieldErrors}
            sentRowKeys={sentRowKeys}
            problems={problems}
            idPrefix="bid-tier"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Place Bid" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
