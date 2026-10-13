"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  AttributeInput,
  AttributeItem,
  AttributeValueInput,
  AttributeValueItem,
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  listAttributeValues,
  listAttributes,
  updateAttribute,
  updateAttributeValue,
} from "@/lib/attribute-api";
import { apiErrorDetail, isConflict } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { DeleteConflictBanner } from "../_shared/delete-conflict";
import styles from "../management.module.css";

/** A refused delete (409): the server's own message plus the record it was
 * about, so the banner can offer "Deactivate" instead. */
interface DeleteConflict {
  kind: "attribute" | "value";
  id: number;
  message: string;
}

function activeBadge(active: boolean) {
  return (
    <span className={`${styles.badge} ${active ? styles.badgeGreen : styles.badgeGray}`}>
      {active ? "active" : "inactive"}
    </span>
  );
}

function AttributeForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: AttributeItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: AttributeInput) => void;
}) {
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim() || null;
    onSubmit({
      name: String(data.get("name") ?? "").trim(),
      name_bn: text("name_bn"),
      description: text("description"),
      description_bn: text("description_bn"),
      is_active: isActive,
    });
  }

  const err = (key: string) =>
    fieldErrors[key]?.[0] ? <p className={styles.fieldError}>{fieldErrors[key]?.[0]}</p> : null;

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="attribute-name">
            Name
          </label>
          <input
            id="attribute-name"
            name="name"
            className={styles.input}
            defaultValue={initial?.name}
            placeholder="e.g. Size"
            required
          />
          {err("name")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="attribute-name-bn">
            Name in Bangla (optional)
          </label>
          <input
            id="attribute-name-bn"
            name="name_bn"
            className={styles.input}
            defaultValue={initial?.name_bn ?? ""}
          />
          {err("name_bn")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="attribute-description">
            Description (optional)
          </label>
          <textarea
            id="attribute-description"
            name="description"
            className={styles.textarea}
            defaultValue={initial?.description ?? ""}
          />
          {err("description")}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="attribute-description-bn">
            Description in Bangla (optional)
          </label>
          <textarea
            id="attribute-description-bn"
            name="description_bn"
            className={styles.textarea}
            defaultValue={initial?.description_bn ?? ""}
          />
          {err("description_bn")}
        </div>
        <div className={styles.checkboxField}>
          <input
            id="attribute-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <label htmlFor="attribute-is-active">
            Active (can be picked for new SKU options; SKUs that already use it are not touched)
          </label>
        </div>
        {err("is_active")}
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Attribute"}
        </button>
      </div>
    </form>
  );
}

/** One value's form — used for adding a value and for editing one in place.
 * A value can never move to another attribute, so only the attribute it was
 * created under is ever sent. */
function ValueForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: AttributeValueItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: AttributeValueInput) => void;
}) {
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const idKey = initial ? `value-${initial.id}` : "value-new";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim() || null;
    onSubmit({
      name: String(data.get("name") ?? "").trim(),
      name_bn: text("name_bn"),
      description: text("description"),
      description_bn: text("description_bn"),
      is_active: isActive,
    });
  }

  const err = (key: string) =>
    fieldErrors[key]?.[0] ? <p className={styles.fieldError}>{fieldErrors[key]?.[0]}</p> : null;

  return (
    <form className={styles.repeatRow} onSubmit={handleSubmit}>
      {formError && (
        <p className={styles.errorBanner} style={{ gridColumn: "1 / -1" }}>
          {formError}
        </p>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${idKey}-name`}>
          Value
        </label>
        <input
          id={`${idKey}-name`}
          name="name"
          className={styles.input}
          defaultValue={initial?.name}
          placeholder="e.g. XL"
          required
        />
        {err("name")}
        {err("attribute")}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${idKey}-name-bn`}>
          Value in Bangla (optional)
        </label>
        <input
          id={`${idKey}-name-bn`}
          name="name_bn"
          className={styles.input}
          defaultValue={initial?.name_bn ?? ""}
        />
        {err("name_bn")}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${idKey}-description`}>
          Description (optional)
        </label>
        <input
          id={`${idKey}-description`}
          name="description"
          className={styles.input}
          defaultValue={initial?.description ?? ""}
        />
        {err("description")}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${idKey}-description-bn`}>
          Description in Bangla (optional)
        </label>
        <input
          id={`${idKey}-description-bn`}
          name="description_bn"
          className={styles.input}
          defaultValue={initial?.description_bn ?? ""}
        />
        {err("description_bn")}
      </div>
      <div className={styles.checkboxField}>
        <input
          id={`${idKey}-is-active`}
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        <label htmlFor={`${idKey}-is-active`}>Active</label>
      </div>
      <div className={styles.formActions} style={{ gridColumn: "1 / -1", marginTop: 0 }}>
        <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save Value" : "Add Value"}
        </button>
      </div>
    </form>
  );
}

/** The values of one attribute, managed inside its edit dialog: add, edit,
 * activate / deactivate and delete. A value that a SKU uses cannot be deleted
 * (409) — the message is shown and "Deactivate" is offered instead. */
function ValuesManager({
  attribute,
  onChanged,
  onAuthError,
}: {
  attribute: AttributeItem;
  onChanged: () => void;
  onAuthError: (err: unknown) => boolean;
}) {
  const [values, setValues] = useState<AttributeValueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<{ kind: "add" } | { kind: "edit"; id: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DeleteConflict | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((t) => t + 1);
    onChanged();
  }, [onChanged]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);
    listAttributeValues(new URLSearchParams({ attribute: String(attribute.id), limit: "100" }))
      .then((page) => {
        if (!cancelled) setValues(page.results);
      })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return;
        setLoadError("Couldn't load the values. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attribute.id, reloadToken]);

  function openForm(next: typeof mode) {
    setFieldErrors({});
    setFormError(null);
    setActionError(null);
    setConflict(null);
    setMode(next);
  }

  async function handleSubmit(input: AttributeValueInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (mode?.kind === "edit") {
        await updateAttributeValue(mode.id, input);
      } else {
        await createAttributeValue({ ...input, attribute: attribute.id });
      }
      setMode(null);
      reload();
    } catch (err) {
      if (!onAuthError(err)) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        setFieldErrors(fe);
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function setActive(value: AttributeValueItem, active: boolean) {
    setActionError(null);
    setConflict(null);
    try {
      await updateAttributeValue(value.id, { is_active: active });
      reload();
    } catch (err) {
      if (onAuthError(err)) return;
      setActionError(
        apiErrorDetail(err) ?? `Couldn't ${active ? "activate" : "deactivate"} this value.`,
      );
    }
  }

  async function handleDelete(value: AttributeValueItem) {
    if (!window.confirm(`Delete the value "${value.name}"? This cannot be undone.`)) return;
    setActionError(null);
    setConflict(null);
    try {
      await deleteAttributeValue(value.id);
      reload();
    } catch (err) {
      if (onAuthError(err)) return;
      const message = apiErrorDetail(err) ?? "Couldn't delete this value. Please try again.";
      if (isConflict(err)) setConflict({ kind: "value", id: value.id, message });
      else setActionError(message);
    }
  }

  async function deactivateConflicting() {
    if (!conflict) return;
    const value = values.find((v) => v.id === conflict.id);
    if (value) await setActive(value, false);
  }

  return (
    <div className={styles.skuSection} style={{ marginTop: "1.25rem" }}>
      <p className={styles.sectionDivider} style={{ gridColumn: "auto" }}>
        Values of {attribute.name}
      </p>

      {loadError && <p className={styles.errorBanner}>{loadError}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {conflict && (
        <DeleteConflictBanner
          message={conflict.message}
          onDeactivate={deactivateConflicting}
          onDismiss={() => setConflict(null)}
        />
      )}

      {loading ? (
        <p className={styles.stateRow}>Loading…</p>
      ) : values.length === 0 ? (
        <p className={styles.stateRow}>No values yet. Add the first one below.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: "30rem" }}>
            <thead>
              <tr>
                <th>Value</th>
                <th>Bangla</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {values.map((value) =>
                mode?.kind === "edit" && mode.id === value.id ? (
                  <tr key={value.id}>
                    <td colSpan={4}>
                      <ValueForm
                        initial={value}
                        fieldErrors={fieldErrors}
                        formError={formError}
                        submitting={submitting}
                        onCancel={() => setMode(null)}
                        onSubmit={handleSubmit}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={value.id}>
                    <td className={styles.primaryText}>{value.name}</td>
                    <td className={styles.secondaryText}>{value.name_bn ?? "—"}</td>
                    <td>{activeBadge(value.is_active)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => openForm({ kind: "edit", id: value.id })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => setActive(value, !value.is_active)}
                        >
                          {value.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          onClick={() => handleDelete(value)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {mode?.kind === "add" ? (
        <ValueForm
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => setMode(null)}
          onSubmit={handleSubmit}
        />
      ) : (
        <button
          type="button"
          className={styles.addRowButton}
          onClick={() => openForm({ kind: "add" })}
          disabled={!attribute.is_active}
          title={attribute.is_active ? undefined : "Activate the attribute to add values"}
        >
          + Add value
        </button>
      )}
    </div>
  );
}

/** The "Attributes" tab inside the Catalog panel: the kinds of option (Size,
 * Colour…) and their values that listing SKUs are built from. */
export function AttributesPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<AttributeItem>(listAttributes, search, { is_active: activeFilter || undefined });

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<AttributeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<DeleteConflict | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  function openModal(mode: "create" | "edit", item: AttributeItem | null) {
    setConflict(null);
    setActionError(null);
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setModalMode(mode);
  }

  async function handleDeleteClick(item: AttributeItem) {
    if (
      !window.confirm(
        `Delete attribute "${item.name}" and all its values? This cannot be undone.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setConflict(null);
    try {
      await deleteAttribute(item.id);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = apiErrorDetail(err) ?? "Couldn't delete this attribute. Please try again.";
      // 409 = a SKU still uses it; the message says to deactivate instead.
      if (isConflict(err)) setConflict({ kind: "attribute", id: item.id, message });
      else setActionError(message);
    }
  }

  async function deactivateConflicting() {
    if (!conflict) return;
    try {
      await updateAttribute(conflict.id, { is_active: false });
      setConflict(null);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      setConflict(null);
      setActionError(apiErrorDetail(err) ?? "Couldn't deactivate this attribute.");
    }
  }

  async function handleFormSubmit(input: AttributeInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        const created = await createAttribute(input);
        // Stay in the dialog in edit mode so the values can be added right away.
        setEditingItem(created);
        setModalMode("edit");
      } else if (editingItem) {
        setEditingItem(await updateAttribute(editingItem.id, input));
      }
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
            placeholder="Search by name (English or Bangla)"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">All attributes</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button type="button" className={styles.addButton} onClick={() => openModal("create", null)}>
          + Add Attribute
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {conflict?.kind === "attribute" && (
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
              <th>Attribute</th>
              <th>Values</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.stateRow}>
                  No attributes found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.primaryText}>{item.name}</div>
                    {item.name_bn && <div className={styles.secondaryText}>{item.name_bn}</div>}
                  </td>
                  <td>
                    {item.values.length === 0 ? (
                      <span className={styles.secondaryText}>No values</span>
                    ) : (
                      <div className={styles.secondaryText}>
                        {item.values.map((value, index) => (
                          <span
                            key={value.id}
                            style={value.is_active ? undefined : { textDecoration: "line-through" }}
                            title={value.is_active ? undefined : "Inactive"}
                          >
                            {index > 0 ? ", " : ""}
                            {value.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{activeBadge(item.is_active)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => openModal("edit", item)}
                      >
                        Edit &amp; values
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
          title={modalMode === "create" ? "Add Attribute" : `Edit Attribute — ${editingItem?.name ?? ""}`}
          onClose={() => setModalMode(null)}
        >
          <AttributeForm
            key={editingItem?.id ?? "new"}
            initial={editingItem}
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => setModalMode(null)}
            onSubmit={handleFormSubmit}
          />
          {modalMode === "edit" && editingItem && (
            <ValuesManager
              attribute={editingItem}
              onChanged={refetch}
              onAuthError={handleAuthError}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
