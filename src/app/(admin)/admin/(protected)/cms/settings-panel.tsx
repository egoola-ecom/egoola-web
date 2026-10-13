"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  RESERVED_SETTING_KEYS,
  SettingItem,
  createSetting,
  deleteSetting,
  listSettings,
  updateSetting,
} from "@/lib/cms-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { ReadonlyField } from "../_shared/readonly-field";
import styles from "../management.module.css";

const JSON_HINT = 'Any JSON: a number (10), text in quotes ("hello"), true/false, a list or an object.';

function isReserved(key: string): boolean {
  return RESERVED_SETTING_KEYS.includes(key);
}

/** One-line rendering of a value for the table. */
function previewValue(value: unknown): string {
  return JSON.stringify(value) ?? "";
}

function SettingForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: SettingItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: { key: string; value: unknown }) => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const raw = String(data.get("value") ?? "").trim();
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      setLocalError(`Value must be valid JSON. ${JSON_HINT}`);
      return;
    }
    setLocalError(null);
    onSubmit({ key: initial?.key ?? String(data.get("key") ?? "").trim(), value });
  }

  const err = (field: string) =>
    fieldErrors[field]?.[0] ? <p className={styles.fieldError}>{fieldErrors[field]![0]}</p> : null;

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}
      <div className={styles.formGrid}>
        {initial ? (
          <div className={styles.formGridFull}>
            <ReadonlyField label="Key (cannot be changed)" value={initial.key} />
          </div>
        ) : (
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label className={styles.label} htmlFor="setting-key">
              Key
            </label>
            <input
              id="setting-key"
              name="key"
              className={`${styles.input} ${styles.monoText}`}
              placeholder="commission_rate_default"
              required
            />
            <p className={styles.fieldHint}>
              Lowercase letters, digits and underscores, starting with a letter. It can&apos;t be
              changed later.
            </p>
            {err("key")}
          </div>
        )}

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="setting-value">
            Value
          </label>
          <textarea
            id="setting-value"
            name="value"
            className={`${styles.textarea} ${styles.codeTextarea}`}
            defaultValue={initial ? JSON.stringify(initial.value, null, 2) : ""}
            placeholder="10"
            required
          />
          <p className={styles.fieldHint}>{JSON_HINT}</p>
          {(localError || fieldErrors.value?.[0]) && (
            <p className={styles.fieldError}>{localError ?? fieldErrors.value![0]}</p>
          )}
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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Setting"}
        </button>
      </div>
    </form>
  );
}

export function SettingsPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<SettingItem>(listSettings, search, {});

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<SettingItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  function openModal(mode: "create" | "edit", item: SettingItem | null) {
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setModalMode(mode);
  }

  async function handleDeleteClick(item: SettingItem) {
    if (!window.confirm(`Delete the "${item.key}" setting? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteSetting(item.key);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      setActionError("Couldn't delete this setting. Please try again.");
    }
  }

  async function handleFormSubmit(input: { key: string; value: unknown }) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createSetting(input);
      } else if (editingItem) {
        await updateSetting(editingItem.key, input.value);
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
            placeholder="Search by key"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button type="button" className={styles.addButton} onClick={() => openModal("create", null)}>
          + Add Setting
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Updated</th>
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
                  No settings found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.key}>
                  <td className={`${styles.primaryText} ${styles.monoText}`}>{item.key}</td>
                  <td className={`${styles.secondaryText} ${styles.monoText}`}>
                    <div className={styles.clampText} title={previewValue(item.value)}>
                      {previewValue(item.value)}
                    </div>
                  </td>
                  <td className={styles.secondaryText}>
                    {new Date(item.updated_at).toLocaleDateString()}
                  </td>
                  <td>
                    {isReserved(item.key) ? (
                      <span className={styles.secondaryText}>Managed in Site Logo</span>
                    ) : (
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
                    )}
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
          title={modalMode === "create" ? "Add Setting" : "Edit Setting"}
          onClose={() => setModalMode(null)}
        >
          <SettingForm
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
