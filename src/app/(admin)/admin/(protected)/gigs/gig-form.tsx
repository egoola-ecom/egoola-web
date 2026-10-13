"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbnailControl } from "@/components/thumbnail-control";
import { MediaPreview } from "@/components/media-preview";
import { resolveMediaUrl } from "@/lib/env";
import { GigDetail, GigInput } from "@/lib/gig-api";
import { publicGeographyLoaders } from "@/lib/geography-api";
import { ListingStatus } from "@/lib/listing-api";
import {
  LISTING_MEDIA_ACCEPT,
  LISTING_MEDIA_MAX_BYTES,
  LISTING_MEDIA_MAX_PER_LISTING,
  LISTING_MEDIA_MAX_PER_REQUEST,
  LISTING_MEDIA_TYPES,
} from "@/lib/seller-listing-api";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors } from "@/lib/use-managed-list";
import { fromLocalInput, toLocalInput } from "../_shared/datetime";
import { GeographyFields } from "../_shared/geography-fields";
import { CategoryParentPicker } from "../catalog/category-parent-picker";
import { SellerCategoryPicker } from "../catalog/listings/seller-category-picker";
import {
  ListingOwnerKind,
  ListingOwnerPicker,
} from "../catalog/listings/listing-owner-picker";
import { ListingThumbnailHandlers } from "../catalog/listings/listing-form";
import { LISTING_STATUS_OPTIONS, statusNeedsNote } from "../catalog/listings/listing-utils";
import { PackagesEditor } from "./packages-editor";
import {
  PackageProblems,
  PackageRow,
  buildPackagePayload,
  hasProblems,
  initialPackages,
  validatePackages,
} from "./package-model";
import styles from "../management.module.css";

/** What the form hands to its parent: the JSON body (the whole gig on create,
 * only what changed on edit) plus gallery media changes and the picked
 * thumbnail, which the parent saves in their own requests. */
export interface GigFormValues {
  input: Partial<GigInput>;
  files: File[];
  deleteIds: number[];
  /** Create only: uploaded right after the gig exists (its own endpoint). */
  thumbnail: File | null;
}

/** What the form starts from: the shared fields of the admin's and the
 * seller's gig (the owner only exists on the admin's). */
export type GigFormInitial = Omit<
  GigDetail,
  "seller" | "posted_by_role" | "info_change_logs" | "status_change_logs"
> & { seller?: number | null };

/** Keys the form shows an error beside. Anything else the server complains
 * about is listed in the banner, so an error is never swallowed. */
const PLACED_ERROR_KEYS = new Set([
  "title",
  "title_bn",
  "description",
  "description_bn",
  "category",
  "seller",
  "currency",
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
  "image",
]);

function unplacedErrors(fieldErrors: FieldErrors): string[] {
  return Object.entries(fieldErrors)
    .filter(([key]) => !PLACED_ERROR_KEYS.has(key) && !key.startsWith("skus"))
    .flatMap(([key, messages]) =>
      (messages ?? []).map((message) => (key === "detail" ? message : `${key}: ${message}`)),
    );
}

/** Blank and missing compare equal: the server returns null for what the form
 * shows as "". */
function norm(value: unknown): string {
  if (value == null || value === "") return "";
  return JSON.stringify(value);
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return new Date(a).getTime() === new Date(b).getTime();
}

/** Create / edit form for a gig (a seller's service offer). Create mode also
 * offers an initial status (the server defaults an admin-created gig to
 * approved); edit mode leaves status alone — moderation lives on the details
 * page, and only the fields that changed are sent. */
export function GigForm({
  mode,
  variant = "admin",
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
  thumbnail,
}: {
  mode: "create" | "edit";
  /** "seller" is the seller panel's form: no owner, status or currency, the
   * seller's own category lookup and the public geography lists, and a message
   * to the reviewer when saving sends a gig back for review. */
  variant?: "admin" | "seller";
  initial?: GigFormInitial | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: GigFormValues) => void;
  /** Edit mode: lets the thumbnail control save at once. */
  thumbnail?: ListingThumbnailHandlers;
}) {
  const isSeller = variant === "seller";
  const sendsForReview =
    isSeller &&
    mode === "edit" &&
    (initial?.status === "rejected" || initial?.status === "changes_requested");
  const [reviewerNote, setReviewerNote] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category ?? null);
  const [ownerKind, setOwnerKind] = useState<ListingOwnerKind>(
    initial?.seller != null ? "seller" : "none",
  );
  const [ownerId, setOwnerId] = useState<number | null>(initial?.seller ?? null);
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [currency, setCurrency] = useState(initial?.currency ?? "BDT");
  const [packages, setPackages] = useState<PackageRow[]>(() => initialPackages(initial?.skus));
  // Row key of each `skus` item of the last save attempt, so a server error
  // reported by position ("skus.0.price") lands on the right package.
  const [sentRowKeys, setSentRowKeys] = useState<string[]>([]);
  const [problems, setProblems] = useState<PackageProblems | null>(null);
  const [initialStatus, setInitialStatus] = useState<ListingStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deleteIds, setDeleteIds] = useState<Set<number>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);

  const geo = useGeographySelection(
    {
      country: initial?.country,
      state: initial?.state,
      city: initial?.city,
      thana: initial?.thana,
    },
    isSeller ? publicGeographyLoaders : undefined,
  );

  const keptMediaCount = (initial?.media ?? []).filter((m) => !deleteIds.has(m.id)).length;

  /** Adds picked files. For a seller the server's media limits are checked
   * here too (type, 10 MB each, 10 per save, 20 per gig); an admin has none. */
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
      } else if (keptMediaCount + newFiles.length + accepted.length >= LISTING_MEDIA_MAX_PER_LISTING) {
        problems.push(`${file.name}: a gig can have up to ${LISTING_MEDIA_MAX_PER_LISTING} files.`);
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length > 0) setNewFiles((prev) => [...prev, ...accepted]);
    if (problems.length > 0) setMediaMessage(problems.join(" "));
  }

  function toggleDelete(id: number) {
    setDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (categoryId == null) {
      setLocalError("Pick a service category for this gig.");
      return;
    }
    if (
      isSeller &&
      (newFiles.length > LISTING_MEDIA_MAX_PER_REQUEST ||
        keptMediaCount + newFiles.length > LISTING_MEDIA_MAX_PER_LISTING)
    ) {
      setLocalError(
        `A gig can have up to ${LISTING_MEDIA_MAX_PER_LISTING} files, and you can add ${LISTING_MEDIA_MAX_PER_REQUEST} at a time. Remove some files first.`,
      );
      return;
    }
    if (!isSeller && ownerKind === "seller" && ownerId == null) {
      setLocalError('Pick a seller, or choose "No owner".');
      return;
    }

    // Checked here first so the admin sees each problem beside its package;
    // the server's own errors are mapped onto the same cards afterwards.
    const found = validatePackages(packages, mode);
    setProblems(found);
    if (hasProblems(found)) {
      setLocalError("Fix the packages marked below, then save again.");
      return;
    }
    const built = buildPackagePayload(packages, mode);
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
    const seller = ownerKind === "seller" ? ownerId : null;
    const currencyValue = currency.trim() || "BDT";

    let input: Partial<GigInput>;
    if (mode === "create") {
      input = {
        category: categoryId,
        title,
        title_bn: text("title_bn"),
        description,
        description_bn: text("description_bn"),
        seller,
        currency: currencyValue,
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
        skus: built.skus,
      };
      if (initialStatus) {
        input.status = initialStatus;
        const note = statusNote.trim();
        if (note) input.note = note;
      }
    } else {
      // Only what really differs from the saved gig is sent.
      input = {};
      const was = initial;
      if (categoryId !== was?.category) input.category = categoryId;
      if (title !== (was?.title ?? "")) input.title = title;
      if (norm(text("title_bn")) !== norm(was?.title_bn)) input.title_bn = text("title_bn");
      if (description !== (was?.description ?? "")) input.description = description;
      if (norm(text("description_bn")) !== norm(was?.description_bn)) {
        input.description_bn = text("description_bn");
      }
      if (seller !== (was?.seller ?? null)) input.seller = seller;
      if (currencyValue !== (was?.currency ?? "BDT")) input.currency = currencyValue;
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
        norm(geo.countryId) !== norm(was?.country) ||
        norm(geo.stateId) !== norm(was?.state) ||
        norm(geo.cityId) !== norm(was?.city) ||
        norm(geo.thanaId) !== norm(was?.thana);
      if (placeChanged) {
        input.country = geo.countryId;
        input.state = geo.stateId;
        input.city = geo.cityId;
        input.thana = geo.thanaId;
      }
      if (built.skus) input.skus = built.skus;
    }

    if (isSeller) {
      // A seller never sends these; the server ignores them anyway.
      delete input.seller;
      delete input.currency;
      delete input.status;
      const message = reviewerNote.trim();
      if (sendsForReview && message) input.note = message;
      else delete input.note;
    }

    onSubmit({
      input,
      files: newFiles,
      deleteIds: Array.from(deleteIds),
      thumbnail: mode === "create" ? thumbnailFile : null,
    });
  }

  /** "…Update that listing instead. (listing #123)": the number becomes a link
   * to that gig so the admin can open it. */
  function titleError() {
    const message = fieldErrors.title?.[0];
    if (!message) return null;
    const match = /\s*\(listing #(\d+)\)\s*$/.exec(message);
    if (!match) return <p className={styles.fieldError}>{message}</p>;
    return (
      <p className={styles.fieldError}>
        {message.slice(0, match.index)}{" "}
        <Link href={isSeller ? `/seller/gigs/${match[1]}/edit` : `/admin/gigs/${match[1]}`}>
          Open the existing gig (#{match[1]})
        </Link>
      </p>
    );
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

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gig-title">
            Title
          </label>
          <input
            id="gig-title"
            name="title"
            className={styles.input}
            defaultValue={initial?.title}
            required
          />
          {titleError()}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gig-title-bn">
            Title in Bangla (optional)
          </label>
          <input
            id="gig-title-bn"
            name="title_bn"
            lang="bn"
            className={styles.input}
            defaultValue={initial?.title_bn ?? ""}
          />
          {err("title_bn")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gig-description">
            Description
          </label>
          <textarea
            id="gig-description"
            name="description"
            className={styles.textarea}
            defaultValue={initial?.description}
            required
          />
          {err("description")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gig-description-bn">
            Description in Bangla (optional)
          </label>
          <textarea
            id="gig-description-bn"
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
              type="service"
              value={categoryId}
              onChange={setCategoryId}
              inputId="gig-category-search"
            />
          ) : (
            <CategoryParentPicker
              type="service"
              value={categoryId}
              onChange={setCategoryId}
              label="Service category"
              noneLabel={null}
              inputId="gig-category-search"
              activeOnly
            />
          )}
          {err("category")}
        </div>

        {!isSeller && (
          <>
            <ListingOwnerPicker
              kind={ownerKind}
              ownerId={ownerId}
              onChange={(kind, id) => {
                setOwnerKind(kind);
                setOwnerId(id);
              }}
              noneLabel="No owner (admin gig)"
            />
            {err("seller")}
          </>
        )}

        <p className={styles.sectionDivider}>Packages &amp; pricing</p>
        <div className={styles.formGridFull}>
          <PackagesEditor
            mode={mode}
            rows={packages}
            onChange={setPackages}
            currency={currency.trim() || "BDT"}
            fieldErrors={fieldErrors}
            sentRowKeys={sentRowKeys}
            problems={problems}
          />
        </div>

        {!isSeller && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="gig-currency">
              Currency
            </label>
            <input
              id="gig-currency"
              className={styles.input}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              maxLength={8}
            />
            {err("currency")}
          </div>
        )}

        <p className={styles.sectionDivider}>Service details</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="gig-delivery-days">
            Delivery days
          </label>
          <input
            id="gig-delivery-days"
            name="delivery_days"
            type="number"
            min="0"
            className={styles.input}
            defaultValue={initial?.delivery_days ?? ""}
          />
          {err("delivery_days")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gig-available-from">
            Available from
          </label>
          <input
            id="gig-available-from"
            name="available_from"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.available_from)}
          />
          {err("available_from")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gig-available-to">
            Available to
          </label>
          <input
            id="gig-available-to"
            name="available_to"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.available_to)}
          />
          {err("available_to")}
        </div>
        <div className={styles.checkboxField}>
          <input
            id="gig-urgent"
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
          />
          <label htmlFor="gig-urgent">Urgent</label>
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gig-package-includes">
            Package includes
          </label>
          <textarea
            id="gig-package-includes"
            name="package_includes"
            className={styles.textarea}
            defaultValue={initial?.package_includes ?? ""}
          />
          {err("package_includes")}
        </div>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gig-package-includes-bn">
            Package includes in Bangla (optional)
          </label>
          <textarea
            id="gig-package-includes-bn"
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

        <p className={styles.sectionDivider}>Thumbnail</p>
        <div className={styles.formGridFull}>
          {mode === "create" ? (
            <ThumbnailControl
              mode="staged"
              imageUrl={null}
              actorType={isSeller ? "seller" : "admin"}
              loginPath={isSeller ? "/login" : "/admin/login"}
              file={thumbnailFile}
              onFileChange={setThumbnailFile}
              disabled={submitting}
            />
          ) : thumbnail ? (
            <ThumbnailControl
              mode="live"
              imageUrl={initial?.image_url ?? null}
              actorType={thumbnail.actorType}
              loginPath={thumbnail.loginPath}
              onUpload={thumbnail.upload}
              onRemove={thumbnail.remove}
              onFailure={thumbnail.onFailure}
              confirmUpload={thumbnail.confirmUpload}
              disabled={submitting}
            />
          ) : null}
          {err("image")}
        </div>

        <p className={styles.sectionDivider}>Gallery</p>
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
                  <MediaPreview type={media.media_type} url={url} />
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
              id="gig-media-files"
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
              time and {LISTING_MEDIA_MAX_PER_LISTING} per gig. A removed file is deleted for good.
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
              <label className={styles.label} htmlFor="gig-initial-status">
                Status
              </label>
              <select
                id="gig-initial-status"
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
                <label className={styles.label} htmlFor="gig-initial-note">
                  Note{statusNeedsNote(initialStatus) ? " (required for this status)" : " (optional)"}
                </label>
                <textarea
                  id="gig-initial-note"
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
              <label className={styles.label} htmlFor="gig-reviewer-note">
                Message to the reviewer (optional)
              </label>
              <textarea
                id="gig-reviewer-note"
                className={styles.textarea}
                value={reviewerNote}
                maxLength={1000}
                placeholder="For example: I added a clear photo."
                onChange={(event) => setReviewerNote(event.target.value)}
              />
              {err("note")}
              <p className={styles.fieldHint}>
                Saving sends this gig back to the admin for review. There is no separate resubmit
                button.
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
              ? "Create Gig"
              : sendsForReview
                ? "Save and send for review"
                : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
