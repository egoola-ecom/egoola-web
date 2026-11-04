"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  PaymentGateway,
  PaymentGatewayInput,
  createGateway,
  deleteGateway,
  listGateways,
  updateGateway,
} from "@/lib/admin-payment-gateways-api";
import { ApiError, apiErrorDetail } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { useDebounced } from "@/lib/use-debounced";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { formatDateTime } from "../_shared/buyer-cell";
import { ReadonlyField } from "../_shared/readonly-field";
import { SIZE_HINT_IMAGE, takeFile } from "@/lib/file-limits";
import styles from "../management.module.css";

const PAGE_SIZES = [10, 20, 50, 100];
const ICON_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

function GatewayForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial: PaymentGateway | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: PaymentGatewayInput) => void;
}) {
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [icon, setIcon] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.icon_url ?? null);
  const [iconError, setIconError] = useState<string | null>(null);

  function pickIcon(file: File | null) {
    setIconError(null);
    if (file && !ICON_TYPES.includes(file.type)) {
      setIconError("Choose an image file (JPG, PNG, WEBP, GIF or SVG).");
      return;
    }
    setIcon(file);
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({ name: String(data.get("name") ?? "").trim(), is_active: isActive, icon });
  }

  const iconProblem = iconError ?? fieldErrors.icon?.[0];

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="gateway-name">
            Name
          </label>
          <input
            id="gateway-name"
            name="name"
            className={styles.input}
            defaultValue={initial?.name}
            required
          />
          {fieldErrors.name?.[0] && <p className={styles.fieldError}>{fieldErrors.name[0]}</p>}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <span className={styles.label}>Icon (optional)</span>
          <div className={styles.avatarUploader}>
            <div className={styles.avatarPreview} data-testid="gateway-icon-preview">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" />
              ) : (
                "—"
              )}
            </div>
            <label className={styles.fileButton}>
              {initial?.icon_url || icon ? "Replace icon" : "Choose icon"}
              <input
                type="file"
                accept="image/*"
                data-testid="gateway-icon-input"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = takeFile(event.target, setIconError);
                  if (file !== undefined) pickIcon(file);
                }}
              />
            </label>
          </div>
          <p className={styles.fieldHint}>{`Image files only. ${SIZE_HINT_IMAGE}`}</p>
          {iconProblem && <p className={styles.fieldError}>{iconProblem}</p>}
        </div>

        <div className={styles.checkboxField}>
          <input
            id="gateway-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <label htmlFor="gateway-is-active">Active (buyers can pick it at checkout)</label>
        </div>
        {fieldErrors.is_active?.[0] && (
          <p className={`${styles.fieldError} ${styles.formGridFull}`}>{fieldErrors.is_active[0]}</p>
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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Gateway"}
        </button>
      </div>
    </form>
  );
}

/** The ways a buyer can pay at checkout. Nothing a buyer or seller does
 * changes this list; only admin does. */
export function PaymentGatewaysClient() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const search = useDebounced(searchText, 300);
  const [activeFilter, setActiveFilter] = useState("");
  const [pageSize, setPageSize] = useState(20);

  const { items, count, loading, error, offset, setOffset, refetch } =
    useManagedList<PaymentGateway>(
      listGateways,
      search,
      { is_active: activeFilter || undefined },
      pageSize,
    );

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<PaymentGateway | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inUse, setInUse] = useState<PaymentGateway | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaymentGateway | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  function openModal(mode: "create" | "edit", item: PaymentGateway | null) {
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setModalMode(mode);
  }

  async function handleFormSubmit(input: PaymentGatewayInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createGateway(input);
      } else if (editingItem) {
        await updateGateway(editingItem.id, input);
      }
      setModalMode(null);
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        setFieldErrors(fe);
        setFormError(message ?? (err instanceof ApiError && err.status === 400 ? null : apiErrorDetail(err)));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: PaymentGateway) {
    setActionError(null);
    setTogglingId(item.id);
    try {
      await updateGateway(item.id, { is_active: !item.is_active });
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        setActionError(apiErrorDetail(err) ?? `Couldn't change "${item.name}". Please try again.`);
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function runDelete() {
    if (!confirmDelete) return;
    const item = confirmDelete;
    setDeleting(true);
    setActionError(null);
    setInUse(null);
    try {
      await deleteGateway(item.id);
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      setConfirmDelete(null);
      if (handleAuthError(err)) return;
      // 400 on a delete means a payment still points to this gateway.
      if (err instanceof ApiError && err.status === 400) setInUse(item);
      else setActionError(apiErrorDetail(err) ?? "Couldn't delete this gateway. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function deactivateInUse() {
    if (!inUse) return;
    const item = inUse;
    setInUse(null);
    await toggleActiveTo(item, false);
  }

  async function toggleActiveTo(item: PaymentGateway, next: boolean) {
    try {
      await updateGateway(item.id, { is_active: next });
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        setActionError(apiErrorDetail(err) ?? `Couldn't deactivate "${item.name}".`);
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Payment Gateways</h1>
          <p className={styles.subtitle}>
            The ways a buyer can pay at checkout. Only active gateways are offered.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search by name or slug"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">All gateways</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button type="button" className={styles.addButton} onClick={() => openModal("create", null)}>
          + Add Gateway
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {inUse && (
        <p className={styles.errorBanner} role="alert" data-testid="gateway-in-use">
          &quot;{inUse.name}&quot; is still in use by payments, so it can&apos;t be deleted.
          Deactivate it instead: buyers will stop seeing it, and past payments stay as they are.{" "}
          <button type="button" className={styles.actionButton} onClick={deactivateInUse}>
            Deactivate instead
          </button>{" "}
          <button type="button" className={styles.actionButton} onClick={() => setInUse(null)}>
            Dismiss
          </button>
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Gateway</th>
              <th>Slug</th>
              <th>Active</th>
              <th>Created</th>
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
                  No payment gateways found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} data-testid="gateway-row">
                  <td>
                    <div className={styles.thumbCell}>
                      {item.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.thumb} src={item.icon_url} alt="" />
                      ) : (
                        <span className={styles.thumb} aria-hidden="true" />
                      )}
                      <span className={styles.primaryText}>{item.name}</span>
                    </div>
                  </td>
                  <td className={styles.secondaryText}>{item.slug}</td>
                  <td>
                    <label className={styles.checkboxField} style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label={`${item.name} is active`}
                        checked={item.is_active}
                        disabled={togglingId === item.id}
                        onChange={() => toggleActive(item)}
                      />
                      <span className={`${styles.badge} ${item.is_active ? styles.badgeGreen : styles.badgeGray}`}>
                        {item.is_active ? "active" : "inactive"}
                      </span>
                    </label>
                  </td>
                  <td className={styles.secondaryText}>{formatDateTime(item.created_at)}</td>
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
                        onClick={() => {
                          setActionError(null);
                          setInUse(null);
                          setConfirmDelete(item);
                        }}
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
          <select
            className={styles.filterSelect}
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => {
              setOffset(0);
              setPageSize(Number(event.target.value));
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
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
          title={modalMode === "create" ? "Add Payment Gateway" : "Edit Payment Gateway"}
          onClose={() => setModalMode(null)}
        >
          <GatewayForm
            initial={editingItem}
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => setModalMode(null)}
            onSubmit={handleFormSubmit}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete payment gateway" onClose={() => !deleting && setConfirmDelete(null)}>
          <p>
            Delete &quot;{confirmDelete.name}&quot;? This cannot be undone. If you only want buyers
            to stop seeing it, deactivate it instead.
          </p>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={runDelete}
              disabled={deleting}
              data-testid="confirm-delete-gateway"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
