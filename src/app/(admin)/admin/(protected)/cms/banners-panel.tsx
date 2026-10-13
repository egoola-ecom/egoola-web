"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  BannerInput,
  BannerItem,
  BannerPlacement,
  BannerStatus,
  createBanner,
  deleteBanner,
  listBanners,
  updateBanner,
} from "@/lib/cms-api";
import { getCategoryParentChain } from "@/lib/category-api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { fromLocalInput, toLocalInput } from "../_shared/datetime";
import { CategoryParentPicker } from "../catalog/category-parent-picker";
import styles from "../management.module.css";

const PLACEMENT_OPTIONS: { value: BannerPlacement; label: string }[] = [
  { value: "hero", label: "Hero" },
  { value: "sidebar", label: "Sidebar" },
  { value: "category", label: "Category" },
];

function placementLabel(value: BannerPlacement): string {
  return PLACEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

type ScheduleState = "live" | "scheduled" | "expired" | "inactive";

/** Where a banner is right now: only `live` ones are actually shown on the
 * storefront (active and inside their optional start/end window). */
function scheduleState(banner: BannerItem, now: number): ScheduleState {
  if (banner.status !== "active") return "inactive";
  if (banner.starts_at && new Date(banner.starts_at).getTime() > now) return "scheduled";
  if (banner.ends_at && new Date(banner.ends_at).getTime() <= now) return "expired";
  return "live";
}

const SCHEDULE_BADGE: Record<ScheduleState, string> = {
  live: styles.badgeGreen,
  scheduled: styles.badgeAmber,
  expired: styles.badgeRed,
  inactive: styles.badgeGray,
};

function formatWindow(banner: BannerItem): string {
  if (!banner.starts_at && !banner.ends_at) return "Always";
  const fmt = (value: string) => new Date(value).toLocaleDateString();
  return `${banner.starts_at ? fmt(banner.starts_at) : "…"} → ${banner.ends_at ? fmt(banner.ends_at) : "…"}`;
}

function BannerForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: BannerItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: BannerInput) => void;
}) {
  const [placement, setPlacement] = useState<BannerPlacement>(initial?.placement ?? "hero");
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(resolveMediaUrl(initial?.image_url));
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initial && !imageFile) {
      setLocalError("A banner needs an image.");
      return;
    }
    setLocalError(null);
    const data = new FormData(event.currentTarget);
    onSubmit({
      placement,
      heading: String(data.get("heading") ?? "").trim(),
      small_heading: String(data.get("small_heading") ?? "").trim(),
      link_url: String(data.get("link_url") ?? "").trim(),
      // The server only allows a category on sidebar banners, and keeps a
      // stale one unless it is explicitly cleared — so always send it.
      category: placement === "sidebar" ? categoryId : null,
      status: (data.get("status") as BannerStatus) ?? "active",
      sort_order: Number(data.get("sort_order") ?? 0) || 0,
      starts_at: fromLocalInput(String(data.get("starts_at") ?? "")),
      ends_at: fromLocalInput(String(data.get("ends_at") ?? "")),
      image: imageFile,
    });
  }

  const err = (field: string) =>
    fieldErrors[field]?.[0] ? <p className={styles.fieldError}>{fieldErrors[field]![0]}</p> : null;

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}
      <div className={styles.formGrid}>
        <div className={styles.imageUploader}>
          <div className={styles.imagePreview}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : (
              "No image"
            )}
          </div>
          <label className={styles.fileButton}>
            {initial ? "Replace image" : "Choose image"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>
        {(localError || fieldErrors.image?.[0]) && (
          <p className={`${styles.fieldError} ${styles.formGridFull}`}>
            {localError ?? fieldErrors.image![0]}
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="banner-placement">
            Placement
          </label>
          <select
            id="banner-placement"
            className={styles.select}
            value={placement}
            onChange={(event) => setPlacement(event.target.value as BannerPlacement)}
          >
            {PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {err("placement")}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="banner-status">
            Status
          </label>
          <select
            id="banner-status"
            name="status"
            className={styles.select}
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {err("status")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="banner-heading">
            Heading
          </label>
          <input
            id="banner-heading"
            name="heading"
            className={styles.input}
            defaultValue={initial?.heading}
          />
          {err("heading")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="banner-small-heading">
            Small heading
          </label>
          <input
            id="banner-small-heading"
            name="small_heading"
            className={styles.input}
            defaultValue={initial?.small_heading}
          />
          {err("small_heading")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="banner-link-url">
            Link URL
          </label>
          <input
            id="banner-link-url"
            name="link_url"
            className={styles.input}
            placeholder="/categories/electronics"
            defaultValue={initial?.link_url}
          />
          {err("link_url")}
        </div>

        {placement === "sidebar" && (
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <CategoryParentPicker
              type="product"
              value={categoryId}
              onChange={setCategoryId}
              label="Category (optional)"
              noneLabel="No category"
              inputId="banner-category-search"
            />
            {err("category")}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="banner-starts-at">
            Starts at
          </label>
          <input
            id="banner-starts-at"
            name="starts_at"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.starts_at)}
          />
          {err("starts_at")}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="banner-ends-at">
            Ends at
          </label>
          <input
            id="banner-ends-at"
            name="ends_at"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(initial?.ends_at)}
          />
          {err("ends_at")}
        </div>
        <p className={`${styles.fieldHint} ${styles.formGridFull}`}>
          Leave a date empty for no limit on that side.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="banner-sort-order">
            Sort order
          </label>
          <input
            id="banner-sort-order"
            name="sort_order"
            type="number"
            className={styles.input}
            defaultValue={initial?.sort_order ?? 0}
          />
          {err("sort_order")}
        </div>
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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Banner"}
        </button>
      </div>
    </form>
  );
}

export function BannersPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [placementFilter, setPlacementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [liveFilter, setLiveFilter] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<BannerItem>(listBanners, search, {
      placement: placementFilter || undefined,
      status: statusFilter || undefined,
      active_now: liveFilter || undefined,
    });

  const [now] = useState(() => Date.now());
  const [categoryNames, setCategoryNames] = useState<Record<number, string>>({});

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<BannerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rows only carry a category id — resolve names for the visible page in
  // one batched parent-chain request.
  useEffect(() => {
    const ids = Array.from(
      new Set(items.map((item) => item.category).filter((id): id is number => id != null)),
    );
    if (ids.length === 0) return;
    let cancelled = false;
    getCategoryParentChain(ids)
      .then((chains) => {
        if (cancelled) return;
        const names: Record<number, string> = {};
        for (const chain of chains) {
          names[chain.id] = [...chain.parents, chain].map((c) => c.name).join(" › ");
        }
        setCategoryNames((prev) => ({ ...prev, ...names }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  function openModal(mode: "create" | "edit", item: BannerItem | null) {
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setModalMode(mode);
  }

  async function handleDeleteClick(item: BannerItem) {
    const name = item.heading || `banner #${item.id}`;
    if (!window.confirm(`Delete "${name}"? Its image is removed too and this cannot be undone.`)) {
      return;
    }
    setActionError(null);
    try {
      await deleteBanner(item.id);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      setActionError("Couldn't delete this banner. Please try again.");
    }
  }

  async function handleFormSubmit(input: BannerInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createBanner(input);
      } else if (editingItem) {
        await updateBanner(editingItem.id, input);
      }
      setModalMode(null);
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        setFieldErrors(fe);
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search by heading"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by placement"
            value={placementFilter}
            onChange={(event) => setPlacementFilter(event.target.value)}
          >
            <option value="">All placements</option>
            {PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by visibility"
            value={liveFilter}
            onChange={(event) => setLiveFilter(event.target.value)}
          >
            <option value="">Live or not</option>
            <option value="true">Live now</option>
            <option value="false">Not live</option>
          </select>
        </div>
        <button type="button" className={styles.addButton} onClick={() => openModal("create", null)}>
          + Add Banner
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Banner</th>
              <th>Placement</th>
              <th>Visibility</th>
              <th>Schedule</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.stateRow}>
                  No banners found.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const state = scheduleState(item, now);
                const imageUrl = resolveMediaUrl(item.image_url);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.thumbCell}>
                        {imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" className={styles.bannerThumb} />
                        )}
                        <div>
                          <div className={styles.primaryText}>{item.heading || "(no heading)"}</div>
                          {item.small_heading && (
                            <div className={styles.secondaryText}>{item.small_heading}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {placementLabel(item.placement)}
                      {item.category != null && (
                        <div className={styles.secondaryText}>
                          {categoryNames[item.category] ?? `Category #${item.category}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${SCHEDULE_BADGE[state]}`}>{state}</span>
                    </td>
                    <td className={styles.secondaryText}>{formatWindow(item)}</td>
                    <td className={styles.secondaryText}>{item.sort_order}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => openModal("edit", item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          onClick={() => handleDeleteClick(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          {count === 0 ? "0 results" : `Page ${currentPage} of ${totalPages} — ${count} total`}
        </span>
        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.pageButton}
            disabled={offset + pageSize >= count}
            onClick={() => setOffset(offset + pageSize)}
          >
            Next
          </button>
        </div>
      </div>

      {modalMode && (
        <Modal
          title={modalMode === "create" ? "Add Banner" : "Edit Banner"}
          onClose={() => setModalMode(null)}
        >
          <BannerForm
            initial={editingItem}
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => setModalMode(null)}
            onSubmit={handleFormSubmit}
          />
        </Modal>
      )}
    </div>
  );
}
