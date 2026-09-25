"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  CountryInput,
  CountryItem,
  createCountry,
  deleteCountry,
  listCountries,
  updateCountry,
} from "@/lib/geography-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { ReadonlyField } from "../_shared/readonly-field";
import styles from "../management.module.css";

function CountryForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: CountryItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CountryInput) => void;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({ name: String(data.get("name") ?? "") });
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            className={styles.input}
            defaultValue={initial?.name}
            required
          />
          {fieldErrors.name?.[0] && <p className={styles.fieldError}>{fieldErrors.name[0]}</p>}
        </div>

        {initial && (
          <>
            <ReadonlyField label="Slug" value={initial.slug} />
            <ReadonlyField label="Country code" value={initial.country_code} />
            <ReadonlyField
              label="Audit"
              value={`Created by ${initial.creator_name ?? "—"} · Updated by ${initial.updater_name ?? "—"}`}
            />
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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Country"}
        </button>
      </div>
    </form>
  );
}

export function CountriesPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<CountryItem>(listCountries, search, {});

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CountryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  async function handleDeleteClick(item: CountryItem) {
    if (!window.confirm(`Delete country "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteCountry(item.id);
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't delete this country. Please try again.");
      }
    }
  }

  async function handleFormSubmit(input: CountryInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createCountry(input);
      } else if (editingItem) {
        await updateCountry(editingItem.id, input);
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
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            setEditingItem(null);
            setFieldErrors({});
            setFormError(null);
            setModalMode("create");
          }}
        >
          + Add Country
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Slug</th>
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
                  No countries found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.primaryText}>{item.name}</td>
                  <td className={styles.codeText}>{item.country_code}</td>
                  <td className={styles.secondaryText}>{item.slug}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => {
                          setEditingItem(item);
                          setFieldErrors({});
                          setFormError(null);
                          setModalMode("edit");
                        }}
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
          title={modalMode === "create" ? "Add Country" : "Edit Country"}
          onClose={() => setModalMode(null)}
        >
          <CountryForm
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
