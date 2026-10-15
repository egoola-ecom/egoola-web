"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AttributeItem } from "@/lib/attribute-api";
import { publicGeographyLoaders } from "@/lib/geography-api";
import {
  ListingFormInitial,
  ListingInput,
  ListingPriceTierInput,
  ListingStatus,
  ListingType,
} from "@/lib/listing-api";
import {
  EMPTY_STAGED_FILES,
  ListingFilesControl,
  StagedFiles,
} from "@/components/listing-files-control";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors } from "@/lib/use-managed-list";
import { GeographyFields } from "../../_shared/geography-fields";
import { CategoryParentPicker } from "../category-parent-picker";
import {
  BrandOption,
  MeasurementOption,
  loadListingLookups,
} from "./listing-lookups";
import { ListingOwnerKind, ListingOwnerPicker } from "./listing-owner-picker";
import { SellerCategoryPicker } from "./seller-category-picker";
import { SkuEditor } from "./sku-editor";
import { SkuState, buildSkuPayload, initialSkuState, variantLabel } from "./sku-model";
import {
  LISTING_STATUS_OPTIONS,
  LISTING_TYPE_OPTIONS,
  statusNeedsNote,
} from "./listing-utils";
import { SpecRow, blankSpecRow, sameSpecs, specsToObject, toSpecRows } from "./spec-rows";
import styles from "../../management.module.css";

/** What the form hands to its parent: the JSON body, plus (create only) the
 * files picked before the first save. Files have their own API: the parent
 * sends them with `addFiles` once the listing exists. */
export interface ListingFormValues {
  input: ListingInput;
  files: File[];
  thumbnail: File | null;
}

interface TierRow {
  min_qty: string;
  max_qty: string;
  price: string;
  discounted_price: string;
  /** Id of one of this listing's SKUs ("" = the whole listing). */
  listing_sku: string;
}

/** The checks the server makes on `price_tiers`, done first so the admin sees
 * them beside the tiers: whole quantities of 1 or more, max not below min, no
 * overlap, only the last tier open-ended, discounted price not above price. */
function validateTiers(rows: TierRow[]): string | null {
  const parsed: { min: number; max: number | null; price: number; disc: number | null }[] = [];
  for (const row of rows) {
    const anyValue = [row.min_qty, row.max_qty, row.price, row.discounted_price].some(
      (value) => value.trim() !== "",
    );
    if (!anyValue) continue;
    if (row.min_qty.trim() === "" || row.price.trim() === "") {
      return "Fill the min quantity and the price of every tier, or remove the empty row.";
    }
    const min = Number(row.min_qty);
    const max = row.max_qty.trim() === "" ? null : Number(row.max_qty);
    const price = Number(row.price);
    const disc = row.discounted_price.trim() === "" ? null : Number(row.discounted_price);
    if (!Number.isInteger(min) || min < 1) return "A tier's min quantity must be a whole number, 1 or more.";
    if (max != null && (!Number.isInteger(max) || max < min)) {
      return "A tier's max quantity cannot be below its min quantity.";
    }
    if (!(price >= 0)) return "A tier's price must be 0 or more.";
    if (disc != null && !(disc >= 0 && disc <= price)) {
      return "A tier's discounted price cannot be higher than its price.";
    }
    parsed.push({ min, max, price, disc });
  }
  parsed.sort((a, b) => a.min - b.min);
  for (let i = 0; i < parsed.length - 1; i += 1) {
    if (parsed[i].max == null) return "Only the last tier can have no max quantity.";
    if ((parsed[i].max as number) >= parsed[i + 1].min) {
      return "Price tier quantity ranges must not overlap.";
    }
  }
  return null;
}

function toTierRows(initial?: ListingFormInitial | null): TierRow[] {
  return (initial?.price_tiers ?? []).map((tier) => ({
    min_qty: String(tier.min_qty),
    max_qty: tier.max_qty != null ? String(tier.max_qty) : "",
    price: tier.price,
    // A tier without a discount comes back with discounted_price == price;
    // show that as "no discount" rather than echoing the price twice.
    discounted_price: Number(tier.discounted_price) < Number(tier.price) ? tier.discounted_price : "",
    listing_sku: tier.listing_sku != null ? String(tier.listing_sku) : "",
  }));
}

/** Keys the form shows an error beside. Anything else the server complains
 * about is listed in the banner, so an error is never swallowed. */
const PLACED_ERROR_KEYS = new Set([
  "listing_type",
  "title",
  "title_bn",
  "description",
  "description_bn",
  "category",
  "seller",
  "buyer",
  "brand",
  "model",
  "origin",
  "origin_bn",
  "warranty",
  "warranty_bn",
  "currency",
  "price_tiers",
  "min_order_qty",
  "measurement",
  "condition_note",
  "condition_note_bn",
  "attributes",
  "country",
  "state",
  "city",
  "thana",
  "media_file",
  "status",
  "note",
]);

function unplacedErrors(fieldErrors: FieldErrors): string[] {
  return Object.entries(fieldErrors)
    .filter(([key]) => !PLACED_ERROR_KEYS.has(key) && !key.startsWith("skus"))
    .flatMap(([key, messages]) =>
      (messages ?? []).map((message) => (key === "detail" ? message : `${key}: ${message}`)),
    );
}

function ownerKindOf(initial?: ListingFormInitial | null): ListingOwnerKind {
  return initial?.seller != null ? "seller" : "none";
}

/** Create / edit form for a PRODUCT listing (a service offer is a gig and has
 * its own form). Create mode also offers an initial status (the server
 * defaults an Admin-created listing to approved); edit mode leaves status
 * alone — moderation lives on the details page. */
export function ListingForm({
  mode,
  variant = "admin",
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  /** "seller" is the seller panel's form: no owner, status or currency, the
   * seller's own lookups and the public geography lists. */
  variant?: "admin" | "seller";
  initial?: ListingFormInitial | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ListingFormValues) => void;
}) {
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category ?? null);
  const isSeller = variant === "seller";
  const [listingType, setListingType] = useState<ListingType | "">(
    initial?.listing_type ?? (isSeller ? "general" : ""),
  );
  const [ownerKind, setOwnerKind] = useState<ListingOwnerKind>(ownerKindOf(initial));
  const [ownerId, setOwnerId] = useState<number | null>(initial?.seller ?? initial?.buyer ?? null);
  const [brandId, setBrandId] = useState<string>(initial?.brand != null ? String(initial.brand) : "");
  const [measurementId, setMeasurementId] = useState<string>(
    initial?.measurement != null ? String(initial.measurement) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "BDT");
  const [skuState, setSkuState] = useState<SkuState>(() => initialSkuState(initial));
  // Row key of each `skus` item of the last save attempt, so a server error
  // reported by position ("skus.0.price") lands on the right row.
  const [sentRowKeys, setSentRowKeys] = useState<string[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>(() => toTierRows(initial));
  const [initialStatus, setInitialStatus] = useState<ListingStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  // Create only: the files picked before the listing exists.
  const [stagedFiles, setStagedFiles] = useState<StagedFiles>(EMPTY_STAGED_FILES);
  const [localError, setLocalError] = useState<string | null>(null);
  const [tierError, setTierError] = useState<string | null>(null);
  // The seller's message to the reviewer; only used when saving a rejected or
  // changes-requested listing (that save sends it back for review).
  const [reviewerNote, setReviewerNote] = useState("");
  // null = the saved specs are not a flat name / value list: leave them alone.
  const [specRows, setSpecRows] = useState<SpecRow[] | null>(() => toSpecRows(initial?.attributes));

  const geo = useGeographySelection(
    {
      country: initial?.country,
      state: initial?.state,
      city: initial?.city,
      thana: initial?.thana,
    },
    isSeller ? publicGeographyLoaders : undefined,
  );

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementOption[]>([]);
  const [attributes, setAttributes] = useState<AttributeItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadListingLookups(variant).then((lookups) => {
      if (cancelled) return;
      setBrands(lookups.brands);
      setMeasurements(lookups.measurements);
      setAttributes(lookups.attributes);
    });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  // A brand deactivated after it was attached no longer comes back from the
  // active-only list, but keeping it selected must still be possible.
  const attachedBrandMissing =
    initial?.brand != null && !brands.some((brand) => brand.id === initial.brand);

  const brandRequired = listingType === "brand";
  const sendsForReview =
    isSeller &&
    mode === "edit" &&
    (initial?.status === "rejected" || initial?.status === "changes_requested");
  const showTiers = !isSeller || listingType === "wholesale" || tiers.length > 0;
  const showConditionNote =
    !isSeller ||
    listingType === "used" ||
    Boolean(initial?.condition_note) ||
    Boolean(initial?.condition_note_bn);

  function changeOwner(kind: ListingOwnerKind, id: number | null) {
    setOwnerKind(kind);
    setOwnerId(id);
  }

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (categoryId == null) {
      setLocalError("Pick a category for this listing.");
      return;
    }
    if (!isSeller && ownerKind !== "none" && ownerId == null) {
      setLocalError(`Pick a ${ownerKind}, or choose "No owner".`);
      return;
    }

    const tiersProblem = showTiers ? validateTiers(tiers) : null;
    setTierError(tiersProblem);
    if (tiersProblem) {
      setLocalError("Fix the price tiers, then save again.");
      return;
    }

    const sku = buildSkuPayload(skuState, mode);
    if (sku.error) {
      setLocalError(sku.error);
      return;
    }
    setSentRowKeys(sku.rowKeys);

    const data = new FormData(event.currentTarget);
    const text = (key: string): string | null => String(data.get(key) ?? "").trim() || null;
    const whole = (key: string): number | null => {
      const value = String(data.get(key) ?? "").trim();
      return value === "" ? null : Number(value);
    };

    const input: ListingInput = {
      category: categoryId,
      catalog_type: "product",
      listing_type: listingType || null,
      // A product with an owner is that seller's offer; without one it is
      // simply an admin listing. (A buyer's request is a job, not a product.)
      posted_by_role: ownerKind === "seller" ? "seller_offer" : null,
      seller: ownerKind === "seller" ? ownerId : null,
      title: String(data.get("title") ?? "").trim(),
      title_bn: text("title_bn"),
      description: String(data.get("description") ?? "").trim(),
      description_bn: text("description_bn"),
      brand: brandId ? Number(brandId) : null,
      model: text("model"),
      origin: text("origin"),
      origin_bn: text("origin_bn"),
      warranty: text("warranty"),
      warranty_bn: text("warranty_bn"),
      currency: currency.trim() || "BDT",
      country: geo.countryId,
      state: geo.stateId,
      city: geo.cityId,
      thana: geo.thanaId,
      price_tiers: tiers
        .filter((row) => row.min_qty.trim() !== "" && row.price.trim() !== "")
        .map(
          (row): ListingPriceTierInput => ({
            min_qty: Number(row.min_qty),
            max_qty: row.max_qty.trim() === "" ? null : Number(row.max_qty),
            price: row.price.trim(),
            discounted_price: row.discounted_price.trim() || null,
            // A tier may point at one of this listing's SKUs; the server
            // refuses any SKU on a listing that does not exist yet.
            ...(mode === "edit"
              ? { listing_sku: row.listing_sku ? Number(row.listing_sku) : null }
              : {}),
          }),
        ),
    };
    // On update, `skus` is left out when no SKU changed.
    if (sku.skus) input.skus = sku.skus;

    input.min_order_qty = whole("min_order_qty");
    input.measurement = measurementId ? Number(measurementId) : null;
    input.condition_note = text("condition_note");
    input.condition_note_bn = text("condition_note_bn");
    if (specRows) {
      const specs = specsToObject(specRows);
      // Only a real change is sent, so an untouched form never rewrites them.
      if (!sameSpecs(specs, initial?.attributes)) input.attributes = specs;
    }

    if (mode === "create" && initialStatus && !isSeller) {
      input.status = initialStatus;
      const note = statusNote.trim();
      if (note) input.note = note;
    }

    if (isSeller) {
      // A seller never sends these; the server ignores them anyway.
      delete input.seller;
      delete input.buyer;
      delete input.posted_by_role;
      delete input.currency;
      const message = reviewerNote.trim();
      if (sendsForReview && message) input.note = message;
    }

    onSubmit({
      input,
      files: mode === "create" ? stagedFiles.media : [],
      thumbnail: mode === "create" ? stagedFiles.thumbnail : null,
    });
  }

  /** "…Update the existing listing instead. (listing #681)": the number
   * becomes a link to that listing so the seller can open it. */
  function titleError() {
    const message = fieldErrors.title?.[0];
    if (!message) return null;
    const match = /\s*\(listing #(\d+)\)\s*$/.exec(message);
    if (!match) return <p className={styles.fieldError}>{message}</p>;
    return (
      <p className={styles.fieldError}>
        {message.slice(0, match.index)}{" "}
        <Link href={isSeller ? `/seller/listings/${match[1]}/edit` : `/admin/catalog/listings/${match[1]}`}>
          Open the existing listing (#{match[1]})
        </Link>
      </p>
    );
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
          Basics
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="listing-type">
            Listing format
          </label>
          <select
            id="listing-type"
            className={styles.select}
            value={listingType}
            onChange={(event) => setListingType(event.target.value as ListingType | "")}
          >
            {!isSeller && <option value="">Not set</option>}
            {LISTING_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {err("listing_type")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="listing-title">
            Title
          </label>
          <input
            id="listing-title"
            name="title"
            className={styles.input}
            defaultValue={initial?.title}
            required
          />
          {titleError()}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="listing-title-bn">
            Title in Bangla (optional)
          </label>
          <input
            id="listing-title-bn"
            name="title_bn"
            lang="bn"
            className={styles.input}
            defaultValue={initial?.title_bn ?? ""}
          />
          {err("title_bn")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="listing-description">
            Description
          </label>
          <textarea
            id="listing-description"
            name="description"
            className={styles.textarea}
            defaultValue={initial?.description}
            required
          />
          {err("description")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="listing-description-bn">
            Description in Bangla (optional)
          </label>
          <textarea
            id="listing-description-bn"
            name="description_bn"
            lang="bn"
            className={styles.textarea}
            defaultValue={initial?.description_bn ?? ""}
          />
          {err("description_bn")}
        </div>

        <div className={styles.formGridFull}>
          {isSeller ? (
            <SellerCategoryPicker
              type="product"
              value={categoryId}
              onChange={setCategoryId}
            />
          ) : (
            <CategoryParentPicker
              type="product"
              value={categoryId}
              onChange={setCategoryId}
              label="Category"
              noneLabel={null}
              inputId="listing-category-search"
              activeOnly
            />
          )}
          {err("category")}
        </div>

        {!isSeller && (
          <>
            <ListingOwnerPicker kind={ownerKind} ownerId={ownerId} onChange={changeOwner} />
            {err("seller")}
            {err("buyer")}
          </>
        )}

        <p className={styles.sectionDivider}>Brand &amp; details</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="listing-brand">
            Brand{brandRequired ? " (required for brand listings)" : " (optional)"}
          </label>
          <select
            id="listing-brand"
            className={styles.select}
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
            required={brandRequired}
          >
            <option value="">{brandRequired ? "Select brand" : "No brand"}</option>
            {attachedBrandMissing && initial?.brand != null && (
              <option value={initial.brand}>{initial.brand_name ?? `#${initial.brand}`} (inactive)</option>
            )}
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          {err("brand")}
        </div>

        {(
          [
            ["model", "Model", initial?.model],
            ["origin", "Origin", initial?.origin],
            ["origin_bn", "Origin in Bangla (optional)", initial?.origin_bn],
            ["warranty", "Warranty", initial?.warranty],
            ["warranty_bn", "Warranty in Bangla (optional)", initial?.warranty_bn],
          ] as const
        ).map(([name, label, value]) => (
          <div key={name} className={styles.field}>
            <label className={styles.label} htmlFor={`listing-${name}`}>
              {label}
            </label>
            <input
              id={`listing-${name}`}
              name={name}
              className={styles.input}
              defaultValue={value ?? ""}
              lang={name.endsWith("_bn") ? "bn" : undefined}
            />
            {err(name)}
          </div>
        ))}

        <p className={styles.sectionDivider}>Pricing &amp; stock (SKUs)</p>

        <div className={styles.formGridFull}>
          <SkuEditor
            mode={mode}
            currency={currency.trim() || "BDT"}
            attributes={attributes}
            state={skuState}
            onChange={setSkuState}
            fieldErrors={fieldErrors}
            sentRowKeys={sentRowKeys}
            canManageAttributes={!isSeller}
          />
        </div>

        {!isSeller && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="listing-currency">
            Currency
          </label>
          <input
            id="listing-currency"
            className={styles.input}
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            maxLength={8}
          />
          {err("currency")}
        </div>
        )}

        {showTiers && (
        <div className={styles.repeatGroup}>
          <span className={styles.label}>Price tiers (bulk pricing, optional)</span>
          {tiers.map((tier, index) => (
            <div key={index} className={styles.repeatRow}>
              <button
                type="button"
                className={styles.repeatRowRemove}
                onClick={() => setTiers((rows) => rows.filter((_, i) => i !== index))}
              >
                Remove
              </button>
              {(
                [
                  ["min_qty", "Min quantity"],
                  ["max_qty", "Max quantity (blank = no limit)"],
                  ["price", "Tier price"],
                  ["discounted_price", "Tier discounted price (optional)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={styles.field}>
                  <label className={styles.label} htmlFor={`tier-${key}-${index}`}>
                    {label}
                  </label>
                  <input
                    id={`tier-${key}-${index}`}
                    type="number"
                    min={key === "min_qty" || key === "max_qty" ? "1" : "0"}
                    step={key === "min_qty" || key === "max_qty" ? "1" : "0.01"}
                    className={styles.input}
                    value={tier[key]}
                    onChange={(event) => updateTier(index, { [key]: event.target.value })}
                  />
                </div>
              ))}
              {!isSeller && mode === "edit" && (initial?.skus.length ?? 0) > 1 && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`tier-listing_sku-${index}`}>
                    Applies to
                  </label>
                  <select
                    id={`tier-listing_sku-${index}`}
                    className={styles.select}
                    value={tier.listing_sku}
                    onChange={(event) => updateTier(index, { listing_sku: event.target.value })}
                  >
                    <option value="">Whole listing</option>
                    {initial?.skus.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku ||
                          variantLabel(
                            item.variants.map((v) => ({
                              attributeName: v.attribute_name,
                              valueName: v.attribute_value_name,
                            })),
                          )}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
          {tierError && <p className={styles.fieldError}>{tierError}</p>}
          {fieldErrors.price_tiers?.map((message, i) => (
            <p key={i} className={styles.fieldError}>
              {message}
            </p>
          ))}
          <button
            type="button"
            className={styles.addRowButton}
            onClick={() =>
              setTiers((rows) => [
                ...rows,
                { min_qty: "", max_qty: "", price: "", discounted_price: "", listing_sku: "" },
              ])
            }
          >
            + Add price tier
          </button>
        </div>
        )}

            <p className={styles.sectionDivider}>Product details</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-min-order-qty">
                Minimum order quantity
              </label>
              <input
                id="listing-min-order-qty"
                name="min_order_qty"
                type="number"
                min="1"
                step="1"
                className={styles.input}
                defaultValue={initial?.min_order_qty ?? ""}
              />
              {err("min_order_qty")}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-measurement">
                Measurement unit
              </label>
              <select
                id="listing-measurement"
                className={styles.select}
                value={measurementId}
                onChange={(event) => setMeasurementId(event.target.value)}
              >
                <option value="">None</option>
                {measurements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.symbol})
                  </option>
                ))}
              </select>
              {err("measurement")}
            </div>
            {showConditionNote && (
              <>
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label} htmlFor="listing-condition-note">
                    Condition note
                  </label>
                  <textarea
                    id="listing-condition-note"
                    name="condition_note"
                    className={styles.textarea}
                    defaultValue={initial?.condition_note ?? ""}
                  />
                  {err("condition_note")}
                </div>
                <div className={`${styles.field} ${styles.formGridFull}`}>
                  <label className={styles.label} htmlFor="listing-condition-note-bn">
                    Condition note in Bangla (optional)
                  </label>
                  <textarea
                    id="listing-condition-note-bn"
                    name="condition_note_bn"
                    lang="bn"
                    className={styles.textarea}
                    defaultValue={initial?.condition_note_bn ?? ""}
                  />
                  {err("condition_note_bn")}
                </div>
              </>
            )}
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <span className={styles.label}>Specifications (optional)</span>
              {specRows == null ? (
                <p className={styles.fieldHint}>
                  This listing&apos;s specifications use an advanced format, so they are kept as they
                  are.
                </p>
              ) : (
                <div className={styles.repeatGroup}>
                  {specRows.map((row, index) => (
                    <div key={row.key} className={styles.repeatRow}>
                      <button
                        type="button"
                        className={styles.repeatRowRemove}
                        onClick={() => setSpecRows(specRows.filter((r) => r.key !== row.key))}
                      >
                        Remove
                      </button>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`spec-name-${index}`}>
                          Name
                        </label>
                        <input
                          id={`spec-name-${index}`}
                          className={styles.input}
                          value={row.name}
                          placeholder="e.g. RAM"
                          onChange={(event) =>
                            setSpecRows(
                              specRows.map((r) =>
                                r.key === row.key ? { ...r, name: event.target.value } : r,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`spec-value-${index}`}>
                          Value
                        </label>
                        <input
                          id={`spec-value-${index}`}
                          className={styles.input}
                          value={row.value}
                          placeholder="e.g. 6GB"
                          onChange={(event) =>
                            setSpecRows(
                              specRows.map((r) =>
                                r.key === row.key ? { ...r, value: event.target.value } : r,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.addRowButton}
                    onClick={() => setSpecRows([...specRows, blankSpecRow()])}
                  >
                    + Add specification
                  </button>
                </div>
              )}
              {err("attributes")}
            </div>

        <p className={styles.sectionDivider}>Location</p>
        <div className={styles.formGridFull}>
          <GeographyFields geo={geo} />
          {err("country")}
          {err("state")}
          {err("city")}
          {err("thana")}
        </div>

        {mode === "create" && (
          <>
            <p className={styles.sectionDivider}>Thumbnail and gallery</p>
            <div className={styles.formGridFull}>
              <ListingFilesControl
                mode="staged"
                scope={isSeller ? "seller" : "admin"}
                loginPath={isSeller ? "/login" : "/admin/login"}
                value={stagedFiles}
                onChange={setStagedFiles}
                disabled={submitting}
              />
            </div>
          </>
        )}

        {mode === "create" && !isSeller && (
          <>
            <p className={styles.sectionDivider}>Initial status</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-initial-status">
                Status
              </label>
              <select
                id="listing-initial-status"
                className={styles.select}
                value={initialStatus}
                onChange={(event) => setInitialStatus(event.target.value as ListingStatus | "")}
              >
                <option value="">Default (approved)</option>
                {LISTING_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {err("status")}
            </div>
            {initialStatus && (
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label} htmlFor="listing-initial-note">
                  Note{statusNeedsNote(initialStatus) ? " (required for this status)" : " (optional)"}
                </label>
                <textarea
                  id="listing-initial-note"
                  className={styles.textarea}
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  required={statusNeedsNote(initialStatus)}
                />
                {err("note")}
              </div>
            )}
          </>
        )}

        {sendsForReview && (
          <>
            <p className={styles.sectionDivider}>Send for review</p>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label} htmlFor="listing-reviewer-note">
                Message to the reviewer (optional)
              </label>
              <textarea
                id="listing-reviewer-note"
                className={styles.textarea}
                value={reviewerNote}
                maxLength={1000}
                placeholder="For example: I added a clear photo."
                onChange={(event) => setReviewerNote(event.target.value)}
              />
              {err("note")}
              <p className={styles.fieldHint}>
                Saving sends this listing back to the admin for review. There is no separate
                resubmit button.
              </p>
            </div>
          </>
        )}
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create Listing"
              : sendsForReview
                ? "Save and send for review"
                : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
