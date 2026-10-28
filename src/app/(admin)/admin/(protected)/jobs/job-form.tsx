"use client";

import { useState } from "react";
import { JobDetail, JobInput } from "@/lib/admin-jobs-api";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors } from "@/lib/use-managed-list";
import { fromLocalInput, toLocalInput } from "../_shared/datetime";
import { GeographyFields } from "../_shared/geography-fields";
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
import { CategoryParentPicker } from "../catalog/category-parent-picker";
import styles from "../management.module.css";

/** Keys the form shows an error beside; anything else the server complains
 * about is listed in the banner, so an error is never swallowed. */
const PLACED_ERROR_KEYS = new Set([
  "buyer",
  "title",
  "title_bn",
  "description",
  "description_bn",
  "category",
  "delivery_days",
  "available_from",
  "available_to",
  "package_includes",
  "package_includes_bn",
  "country",
  "state",
  "city",
  "thana",
]);

function unplacedErrors(fieldErrors: FieldErrors): string[] {
  return Object.entries(fieldErrors)
    .filter(([key]) => !PLACED_ERROR_KEYS.has(key) && !key.startsWith("skus"))
    .flatMap(([key, messages]) =>
      (messages ?? []).map((message) => (key === "detail" ? message : `${key}: ${message}`)),
    );
}

function norm(value: unknown): string {
  if (value == null || value === "") return "";
  return JSON.stringify(value);
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return new Date(a).getTime() === new Date(b).getTime();
}

/** The buyer's job as the admin writes it: on a buyer's behalf. Create sends
 * the whole job; edit sends only what changed (a status move is not made
 * here, it is on the job's page). The job always starts open for bidding. */
export function JobForm({
  mode,
  initial,
  initialBuyer,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: JobDetail | null;
  /** Preselected buyer on create (a link from a buyer's page). */
  initialBuyer?: number | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: Partial<JobInput> & { buyer?: number }) => void;
}) {
  const [buyerId, setBuyerId] = useState<number | null>(initialBuyer ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category.id ?? null);
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [tiers, setTiers] = useState<TierRow[]>(() => tiersFromSaved(initial?.skus));
  const [sentRowKeys, setSentRowKeys] = useState<string[]>([]);
  const [problems, setProblems] = useState<TierProblems | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [buyerError, setBuyerError] = useState<string | null>(null);

  const geo = useGeographySelection({
    country: initial?.location.country,
    state: initial?.location.state,
    city: initial?.location.city,
    thana: initial?.location.thana,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    setBuyerError(null);

    if (mode === "create" && buyerId == null) {
      setBuyerError("Say which buyer this job is for.");
      setLocalError("Pick the buyer this job is for.");
      return;
    }
    if (categoryId == null) {
      setLocalError("Pick a service category for this job.");
      return;
    }
    const found = validateTiers(tiers, { withDuration: false, requireOne: true, noun: "budget option" });
    setProblems(found);
    if (hasTierProblems(found)) {
      setLocalError("Fix the budget rows marked below, then save again.");
      return;
    }
    const built = buildTierPayload(tiers, mode, false);
    setSentRowKeys(built.rowKeys);

    const data = new FormData(event.currentTarget);
    const text = (key: string): string | null => String(data.get(key) ?? "").trim() || null;
    const whole = (key: string): number | null => {
      const value = String(data.get(key) ?? "").trim();
      return value === "" ? null : Number(value);
    };
    const availableFrom = fromLocalInput(String(data.get("available_from") ?? ""));
    const availableTo = fromLocalInput(String(data.get("available_to") ?? ""));
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const skus = built.items as JobInput["skus"] | undefined;

    if (mode === "create") {
      onSubmit({
        buyer: buyerId as number,
        category: categoryId,
        title,
        title_bn: text("title_bn"),
        description,
        description_bn: text("description_bn"),
        delivery_days: whole("delivery_days"),
        urgent,
        package_includes: text("package_includes"),
        package_includes_bn: text("package_includes_bn"),
        available_from: availableFrom,
        available_to: availableTo,
        country: geo.countryId,
        state: geo.stateId,
        city: geo.cityId,
        thana: geo.thanaId,
        skus,
      });
      return;
    }

    const input: Partial<JobInput> = {};
    const was = initial;
    if (categoryId !== was?.category.id) input.category = categoryId;
    if (title !== (was?.title ?? "")) input.title = title;
    if (norm(text("title_bn")) !== norm(was?.title_bn)) input.title_bn = text("title_bn");
    if (description !== (was?.description ?? "")) input.description = description;
    if (norm(text("description_bn")) !== norm(was?.description_bn)) {
      input.description_bn = text("description_bn");
    }
    if (norm(whole("delivery_days")) !== norm(was?.delivery_days)) {
      input.delivery_days = whole("delivery_days");
    }
    if (urgent !== Boolean(was?.urgent)) input.urgent = urgent;
    if (norm(text("package_includes")) !== norm(was?.package_includes)) {
      input.package_includes = text("package_includes");
    }
    if (norm(text("package_includes_bn")) !== norm(was?.package_includes_bn)) {
      input.package_includes_bn = text("package_includes_bn");
    }
    if (!sameInstant(availableFrom, was?.available_from)) input.available_from = availableFrom;
    if (!sameInstant(availableTo, was?.available_to)) input.available_to = availableTo;
    // The places are one branch of a tree: when one changes, send all four.
    const placeChanged =
      norm(geo.countryId) !== norm(was?.location.country) ||
      norm(geo.stateId) !== norm(was?.location.state) ||
      norm(geo.cityId) !== norm(was?.location.city) ||
      norm(geo.thanaId) !== norm(was?.location.thana);
    if (placeChanged) {
      input.country = geo.countryId;
      input.state = geo.stateId;
      input.city = geo.cityId;
      input.thana = geo.thanaId;
    }
    if (skus) input.skus = skus;
    if (Object.keys(input).length === 0) {
      setLocalError("Nothing has changed.");
      return;
    }
    onSubmit(input);
  }

  function err(key: string) {
    return fieldErrors[key]?.[0] ? (
      <p className={styles.fieldError}>{fieldErrors[key]?.[0]}</p>
    ) : null;
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
          Basics
        </p>

        {mode === "create" && (
          <div className={styles.formGridFull}>
            <PersonPicker
              kind="buyer"
              inputId="job-buyer"
              label="Buyer (the job is posted on their behalf)"
              value={buyerId}
              onChange={(id) => {
                setBuyerId(id);
                setBuyerError(null);
              }}
              error={buyerError ?? fieldErrors.buyer?.[0]}
            />
          </div>
        )}

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="job-title">
            Title
          </label>
          <input id="job-title" name="title" className={styles.input} defaultValue={initial?.title} required />
          {err("title")}
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="job-title-bn">
            Title in Bangla (optional)
          </label>
          <input
            id="job-title-bn"
            name="title_bn"
            lang="bn"
            className={styles.input}
            defaultValue={initial?.title_bn ?? ""}
          />
          {err("title_bn")}
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="job-description">
            Description
          </label>
          <textarea
            id="job-description"
            name="description"
            className={styles.textarea}
            defaultValue={initial?.description}
            required
          />
          {err("description")}
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="job-description-bn">
            Description in Bangla (optional)
          </label>
          <textarea
            id="job-description-bn"
            name="description_bn"
            lang="bn"
            className={styles.textarea}
            defaultValue={initial?.description_bn ?? ""}
          />
          {err("description_bn")}
        </div>

        <div className={styles.formGridFull}>
          <CategoryParentPicker
            type="service"
            value={categoryId}
            onChange={setCategoryId}
            label="Service category"
            noneLabel={null}
            inputId="job-category-search"
            activeOnly
          />
          {err("category")}
        </div>

        <p className={styles.sectionDivider}>Budget</p>
        <div className={styles.formGridFull}>
          <p className={styles.fieldHint}>
            What the buyer is willing to pay. Sellers quote their own price against it. One row per
            price type; a saved row can be changed but not removed.
          </p>
          <TierBuilder
            rows={tiers}
            onChange={setTiers}
            withDuration={false}
            listKey="skus"
            fieldErrors={fieldErrors}
            sentRowKeys={sentRowKeys}
            problems={problems}
            idPrefix="job-budget"
          />
        </div>

        <p className={styles.sectionDivider}>Job details</p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="job-delivery-days">
            Delivery days
          </label>
          <input
            id="job-delivery-days"
            name="delivery_days"
            type="number"
            min="0"
            className={styles.input}
            defaultValue={initial?.delivery_days ?? ""}
          />
          {err("delivery_days")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="job-available-from">
            Needed from
          </label>
          <input
            id="job-available-from"
            name="available_from"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.available_from)}
          />
          {err("available_from")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="job-available-to">
            Needed until
          </label>
          <input
            id="job-available-to"
            name="available_to"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.available_to)}
          />
          {err("available_to")}
        </div>
        <div className={styles.checkboxField}>
          <input
            id="job-urgent"
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
          />
          <label htmlFor="job-urgent">Urgent</label>
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="job-package-includes">
            What the job includes
          </label>
          <textarea
            id="job-package-includes"
            name="package_includes"
            className={styles.textarea}
            defaultValue={initial?.package_includes ?? ""}
          />
          {err("package_includes")}
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="job-package-includes-bn">
            What the job includes in Bangla (optional)
          </label>
          <textarea
            id="job-package-includes-bn"
            name="package_includes_bn"
            lang="bn"
            className={styles.textarea}
            defaultValue={initial?.package_includes_bn ?? ""}
          />
          {err("package_includes_bn")}
        </div>

        <p className={styles.sectionDivider}>Location</p>
        <div className={styles.formGridFull}>
          <GeographyFields geo={geo} />
          {err("country")}
          {err("state")}
          {err("city")}
          {err("thana")}
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create Job" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
