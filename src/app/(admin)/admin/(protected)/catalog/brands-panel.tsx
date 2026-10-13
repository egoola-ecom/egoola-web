"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  BrandInput,
  BrandItem,
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "@/lib/brand-api";
import { apiErrorDetail, isConflict } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { DeleteConflictBanner } from "../_shared/delete-conflict";
import { ReadonlyField } from "../_shared/readonly-field";
import styles from "../management.module.css";

function BrandForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: BrandItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: BrandInput) => void;
}) {
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({ name: String(data.get("name") ?? ""), is_active: isActive });
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="brand-name">
            Name
          </label>
          <input
            id="brand-name"
            name="name"
            className={styles.input}
            defaultValue={initial?.name}
            required
          />
          {fieldErrors.name?.[0] && <p className={styles.fieldError}>{fieldErrors.name[0]}</p>}
        </div>

        <div className={styles.checkboxField}>
          <input
            id="brand-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <label htmlFor="brand-is-active">Active (can be picked on new listings)</label>
        </div>
        {fieldErrors.is_active?.[0] && (
          <p className={`${styles.fieldError} ${styles.formGridFull}`}>
            {fieldErrors.is_active[0]}
          </p>
        )}

        {initial && <ReadonlyField label="Slug" value={initial.slug} />}
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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Brand"}
        </button>
      </div>
    </form>
  );
}

export function BrandsPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<BrandItem>(listBrands, search, { is_active: activeFilter || undefined });

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<BrandItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ item: BrandItem; message: string } | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  function openModal(mode: "create" | "edit", item: BrandItem | null) {
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setModalMode(mode);
  }

  async function handleDeleteClick(item: BrandItem) {
    if (!window.confirm(`Delete brand "${item.name}"? This cannot be undone.`)) return;
    setActionError(null);
    setConflict(null);
    try {
      await deleteBrand(item.id);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      // 409 = still used by a listing; the server's message says to
      // deactivate instead, so show it as-is and offer that.
      const message = apiErrorDetail(err) ?? "Couldn't delete this brand. Please try again.";
      if (isConflict(err)) setConflict({ item, message });
      else setActionError(message);
    }
  }

  async function deactivateConflicting() {
    if (!conflict) return;
    try {
      await updateBrand(conflict.item.id, { name: conflict.item.name, is_active: false });
      setConflict(null);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      setConflict(null);
      setActionError(apiErrorDetail(err) ?? "Couldn't deactivate this brand.");
    }
  }

  async function handleFormSubmit(input: BrandInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createBrand(input);
      } else if (editingItem) {
        await updateBrand(editingItem.id, input);
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
            placeholder="Search by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">All brands</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button type="button" className={styles.addButton} onClick={() => openModal("create", null)}>
          + Add Brand
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {conflict && (
        <DeleteConflictBanner
          message={conflict.message}
          onDeactivate={deactivateConflicting}
          onDismiss={() => setConflict(null)}
        />
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Created by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.stateRow}>
                  No brands found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.primaryText}>{item.name}</td>
                  <td className={styles.secondaryText}>{item.slug}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${item.is_active ? styles.badgeGreen : styles.badgeGray}`}
                    >
                      {item.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>
                    {item.creator_name
                      ? `${item.creator_name}${item.creator_type ? ` (${item.creator_type})` : ""}`
                      : "—"}
                  </td>
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
              ))
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
          title={modalMode === "create" ? "Add Brand" : "Edit Brand"}
          onClose={() => setModalMode(null)}
        >
          <BrandForm
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
