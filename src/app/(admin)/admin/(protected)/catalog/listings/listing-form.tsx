"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AttributeItem } from "@/lib/attribute-api";
import { resolveMediaUrl } from "@/lib/env";
import { publicGeographyLoaders } from "@/lib/geography-api";
import {
  ListingCatalogType,
  ListingFormInitial,
  ListingInput,
  ListingPostedByRole,
  ListingPriceTierInput,
  ListingPriceType,
  ListingStatus,
  ListingType,
} from "@/lib/listing-api";
import {
  LISTING_MEDIA_ACCEPT,
  LISTING_MEDIA_MAX_BYTES,
  LISTING_MEDIA_MAX_PER_LISTING,
  LISTING_MEDIA_MAX_PER_REQUEST,
  LISTING_MEDIA_TYPES,
} from "@/lib/seller-listing-api";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors } from "@/lib/use-managed-list";
import { GeographyFields } from "../../_shared/geography-fields";
import { fromLocalInput, toLocalInput } from "../../_shared/datetime";
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
  CATALOG_TYPE_OPTIONS,
  LISTING_STATUS_OPTIONS,
  LISTING_TYPE_OPTIONS,
  POSTED_BY_ROLE_OPTIONS,
  statusNeedsNote,
} from "./listing-utils";
import { SpecRow, blankSpecRow, sameSpecs, specsToObject, toSpecRows } from "./spec-rows";
import styles from "../../management.module.css";

/** What the form hands to its parent: the JSON body plus any gallery media
 * changes, which the parent saves in a separate multipart request. */
export interface ListingFormValues {
  input: ListingInput;
  files: File[];
  deleteIds: number[];
}

interface TierRow {
  min_qty: string;
  max_qty: string;
  price: string;
  discounted_price: string;
  /** Id of one of this listing's SKUs ("" = the whole listing). */
  listing_sku: string;
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
  "catalog_type",
  "listing_type",
  "title",
  "title_bn",
  "description",
  "description_bn",
  "category",
  "seller",
  "buyer",
  "posted_by_role",
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
  "price_type",
  "hourly_rate",
  "delivery_days",
  "available_from",
  "available_to",
  "package_includes",
  "package_includes_bn",
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
  if (initial?.seller != null) return "seller";
  if (initial?.buyer != null) return "buyer";
  return "none";
}

/** Create / edit form for a listing. Create mode also offers an initial
 * status (the server defaults an Admin-created listing to approved); edit
 * mode leaves status alone — moderation lives on the details page. */
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
   * seller's own lookups and the public geography lists, and the media
   * limits checked here too. */
  variant?: "admin" | "seller";
  initial?: ListingFormInitial | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ListingFormValues) => void;
}) {
  const [catalogType, setCatalogType] = useState<ListingCatalogType>(
    initial?.catalog_type ?? "product",
  );
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category ?? null);
  const isSeller = variant === "seller";
  const [listingType, setListingType] = useState<ListingType | "">(
    initial?.listing_type ?? (isSeller ? "general" : ""),
  );
  const [postedByRole, setPostedByRole] = useState<ListingPostedByRole | "">(
    initial?.posted_by_role ?? "",
  );
  const [ownerKind, setOwnerKind] = useState<ListingOwnerKind>(ownerKindOf(initial));
  const [ownerId, setOwnerId] = useState<number | null>(initial?.seller ?? initial?.buyer ?? null);
  const [brandId, setBrandId] = useState<string>(initial?.brand != null ? String(initial.brand) : "");
  const [measurementId, setMeasurementId] = useState<string>(
    initial?.measurement != null ? String(initial.measurement) : "",
  );
  const [priceType, setPriceType] = useState<ListingPriceType | "">(initial?.price_type ?? "");
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [currency, setCurrency] = useState(initial?.currency ?? "BDT");
  const [skuState, setSkuState] = useState<SkuState>(() => initialSkuState(initial));
  // Row key of each `skus` item of the last save attempt, so a server error
  // reported by position ("skus.0.price") lands on the right row.
  const [sentRowKeys, setSentRowKeys] = useState<string[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>(() => toTierRows(initial));
  const [initialStatus, setInitialStatus] = useState<ListingStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
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

  const isProduct = catalogType === "product";
  const brandRequired = isProduct && listingType === "brand";
  const sendsForReview =
    isSeller &&
    mode === "edit" &&
    (initial?.status === "rejected" || initial?.status === "changes_requested");
  const showProductBasics = !isSeller || isProduct;
  const showTiers = !isSeller || listingType === "wholesale" || tiers.length > 0;
  const showConditionNote =
    !isSeller ||
    listingType === "used" ||
    Boolean(initial?.condition_note) ||
    Boolean(initial?.condition_note_bn);
  const keptMediaCount = (initial?.media ?? []).filter((m) => !deleteIds.has(m.id)).length;

  function changeCatalogType(next: ListingCatalogType) {
    if (next === catalogType) return;
    setCatalogType(next);
    // Categories belong to one type, so the old pick no longer applies.
    setCategoryId(null);
  }

  function changeOwner(kind: ListingOwnerKind, id: number | null) {
    setOwnerKind(kind);
    setOwnerId(id);
    if (kind === "seller") setPostedByRole("seller_offer");
    if (kind === "buyer") setPostedByRole("buyer_request");
  }

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function toggleDelete(id: number) {
    setDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Adds picked files. For a seller the server's media limits are checked
   * here too (type, 10 MB each, 10 per save, 20 per listing). */
  function addFiles(picked: File[]) {
    setMediaMessage(null);
    if (picked.length === 0) return;
    if (!isSeller) {
      setNewFiles((prev) => [...prev, ...picked]);
      return;
    }
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of picked) {
      if (!LISTING_MEDIA_TYPES.includes(file.type)) {
        problems.push(`${file.name}: only JPG, PNG, WEBP, GIF, MP4 or PDF files are accepted.`);
      } else if (file.size > LISTING_MEDIA_MAX_BYTES) {
        problems.push(`${file.name}: files can be up to 10 MB.`);
      } else if (newFiles.length + accepted.length >= LISTING_MEDIA_MAX_PER_REQUEST) {
        problems.push(`${file.name}: you can add up to ${LISTING_MEDIA_MAX_PER_REQUEST} files at a time.`);
      } else if (
        keptMediaCount + newFiles.length + accepted.length >=
        LISTING_MEDIA_MAX_PER_LISTING
      ) {
        problems.push(`${file.name}: a listing can have up to ${LISTING_MEDIA_MAX_PER_LISTING} files.`);
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length > 0) setNewFiles((prev) => [...prev, ...accepted]);
    if (problems.length > 0) setMediaMessage(problems.join(" "));
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

    if (
      isSeller &&
      (newFiles.length > LISTING_MEDIA_MAX_PER_REQUEST ||
        keptMediaCount + newFiles.length > LISTING_MEDIA_MAX_PER_LISTING)
    ) {
      setLocalError(
        `A listing can have up to ${LISTING_MEDIA_MAX_PER_LISTING} files, and you can add ${LISTING_MEDIA_MAX_PER_REQUEST} at a time. Remove some files first.`,
      );
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
      catalog_type: catalogType,
      // A seller's service has no product format.
      listing_type: isSeller && !isProduct ? null : listingType || null,
      posted_by_role: postedByRole || null,
      seller: ownerKind === "seller" ? ownerId : null,
      buyer: ownerKind === "buyer" ? ownerId : null,
      title: String(data.get("title") ?? "").trim(),
      title_bn: text("title_bn"),
      description: String(data.get("description") ?? "").trim(),
      description_bn: text("description_bn"),
      brand: brandId && showProductBasics ? Number(brandId) : null,
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

    if (isProduct) {
      input.min_order_qty = whole("min_order_qty");
      input.measurement = measurementId ? Number(measurementId) : null;
      input.condition_note = text("condition_note");
      input.condition_note_bn = text("condition_note_bn");
      if (specRows) {
        const specs = specsToObject(specRows);
        // Only a real change is sent, so an untouched form never rewrites them.
        if (!sameSpecs(specs, initial?.attributes)) input.attributes = specs;
      }
    } else {
      input.price_type = priceType || null;
      input.hourly_rate = priceType === "hourly" ? text("hourly_rate") : null;
      input.delivery_days = whole("delivery_days");
      input.urgent = urgent;
      input.package_includes = text("package_includes");
      input.package_includes_bn = text("package_includes_bn");
      input.available_from = fromLocalInput(String(data.get("available_from") ?? ""));
      input.available_to = fromLocalInput(String(data.get("available_to") ?? ""));
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

    onSubmit({ input, files: newFiles, deleteIds: Array.from(deleteIds) });
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
          <label className={styles.label} htmlFor="listing-catalog-type">
            Catalog type
          </label>
          <select
            id="listing-catalog-type"
            className={styles.select}
            value={catalogType}
            onChange={(event) => changeCatalogType(event.target.value as ListingCatalogType)}
          >
            {CATALOG_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {err("catalog_type")}
        </div>

        {(!isSeller || isProduct) && (
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
        )}

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
              key={catalogType}
              type={catalogType}
              value={categoryId}
              onChange={setCategoryId}
            />
          ) : (
            <CategoryParentPicker
              key={catalogType}
              type={catalogType}
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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="listing-posted-by-role">
            Posted as
          </label>
          <select
            id="listing-posted-by-role"
            className={styles.select}
            value={postedByRole}
            onChange={(event) => setPostedByRole(event.target.value as ListingPostedByRole | "")}
          >
            <option value="">Not set</option>
            {POSTED_BY_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {err("posted_by_role")}
        </div>
          </>
        )}

        {showProductBasics && (
          <>
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
          </>
        )}

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
                    min="0"
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

        {isProduct ? (
          <>
            <p className={styles.sectionDivider}>Product details</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-min-order-qty">
                Minimum order quantity
              </label>
              <input
                id="listing-min-order-qty"
                name="min_order_qty"
                type="number"
                min="0"
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
          </>
        ) : (
          <>
            <p className={styles.sectionDivider}>Service details</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-price-type">
                Price type
              </label>
              <select
                id="listing-price-type"
                className={styles.select}
                value={priceType}
                onChange={(event) => setPriceType(event.target.value as ListingPriceType | "")}
              >
                <option value="">Not set</option>
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
              </select>
              {err("price_type")}
            </div>
            {priceType === "hourly" && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="listing-hourly-rate">
                  Hourly rate
                </label>
                <input
                  id="listing-hourly-rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.input}
                  defaultValue={initial?.hourly_rate ?? ""}
                />
                {err("hourly_rate")}
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-delivery-days">
                Delivery days
              </label>
              <input
                id="listing-delivery-days"
                name="delivery_days"
                type="number"
                min="0"
                className={styles.input}
                defaultValue={initial?.delivery_days ?? ""}
              />
              {err("delivery_days")}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-available-from">
                Available from
              </label>
              <input
                id="listing-available-from"
                name="available_from"
                type="datetime-local"
                className={styles.input}
                defaultValue={toLocalInput(initial?.available_from)}
              />
              {err("available_from")}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="listing-available-to">
                Available to
              </label>
              <input
                id="listing-available-to"
                name="available_to"
                type="datetime-local"
                className={styles.input}
                defaultValue={toLocalInput(initial?.available_to)}
              />
              {err("available_to")}
            </div>
            <div className={styles.checkboxField}>
              <input
                id="listing-urgent"
                type="checkbox"
                checked={urgent}
                onChange={(event) => setUrgent(event.target.checked)}
              />
              <label htmlFor="listing-urgent">Urgent</label>
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label} htmlFor="listing-package-includes">
                Package includes
              </label>
              <textarea
                id="listing-package-includes"
                name="package_includes"
                className={styles.textarea}
                defaultValue={initial?.package_includes ?? ""}
              />
              {err("package_includes")}
            </div>
            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label} htmlFor="listing-package-includes-bn">
                Package includes in Bangla (optional)
              </label>
              <textarea
                id="listing-package-includes-bn"
                name="package_includes_bn"
                lang="bn"
                className={styles.textarea}
                defaultValue={initial?.package_includes_bn ?? ""}
              />
              {err("package_includes_bn")}
            </div>
          </>
        )}

        <p className={styles.sectionDivider}>Location</p>
        <div className={styles.formGridFull}>
          <GeographyFields geo={geo} />
          {err("country")}
          {err("state")}
          {err("city")}
          {err("thana")}
        </div>

        <p className={styles.sectionDivider}>Media</p>
        {initial && initial.media.length > 0 && (
          <div className={styles.mediaGrid}>
            {initial.media.map((media) => {
              const url = resolveMediaUrl(media.media_url);
              const removing = deleteIds.has(media.id);
              return (
                <div
                  key={media.id}
                  className={`${styles.mediaTile} ${removing ? styles.mediaTileRemoving : ""}`}
                >
                  {media.media_type === "image" && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className={styles.mediaTilePreview} />
                  ) : (
                    <span className={styles.mediaTilePreview}>{media.media_type}</span>
                  )}
                  <button
                    type="button"
                    className={styles.mediaRemoveToggle}
                    style={{ marginLeft: 0, textAlign: "left" }}
                    onClick={() => toggleDelete(media.id)}
                  >
                    {removing ? "Undo remove" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.fileButton} style={{ alignSelf: "flex-start" }}>
            Add images / files
            <input
              id="listing-media-files"
              type="file"
              multiple
              accept={isSeller ? LISTING_MEDIA_ACCEPT : "image/*,video/*,application/pdf"}
              style={{ display: "none" }}
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </label>
          {newFiles.length > 0 && (
            <div className={styles.mediaList}>
              {newFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className={styles.mediaRow}>
                  <span className={styles.mediaLabel} style={{ textTransform: "none" }}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    className={styles.mediaRemoveToggle}
                    onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {isSeller && (
            <p className={styles.fieldHint}>
              JPG, PNG, WEBP, GIF, MP4 or PDF. Up to 10 MB each, {LISTING_MEDIA_MAX_PER_REQUEST} at a
              time and {LISTING_MEDIA_MAX_PER_LISTING} per listing. A removed file is deleted for
              good.
            </p>
          )}
          {mediaMessage && <p className={styles.fieldError}>{mediaMessage}</p>}
          {fieldErrors.media_file?.map((message, i) => (
            <p key={i} className={styles.fieldError}>
              {message}
            </p>
          ))}
        </div>

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
