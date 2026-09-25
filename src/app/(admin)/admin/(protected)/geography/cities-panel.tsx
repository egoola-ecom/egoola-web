"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  CityInput,
  CityItem,
  GeographyOption,
  createCity,
  deleteCity,
  listCities,
  listCountryOptions,
  listStateOptions,
  updateCity,
} from "@/lib/geography-api";
import { AuthError, clearSession } from "@/lib/auth";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { GeographyFields } from "../_shared/geography-fields";
import { ReadonlyField } from "../_shared/readonly-field";
import styles from "../management.module.css";

function CityForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: CityItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CityInput) => void;
}) {
  const geo = useGeographySelection({
    country: initial?.country.id ?? null,
    state: initial?.state.id ?? null,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      name: String(data.get("name") ?? ""),
      country: geo.countryId as number,
      state: geo.stateId as number,
    });
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

        <GeographyFields geo={geo} upTo="state" />
        {fieldErrors.state?.[0] && (
          <p className={`${styles.fieldError} ${styles.formGridFull}`}>{fieldErrors.state[0]}</p>
        )}

        {initial && (
          <>
            <ReadonlyField label="Slug" value={initial.slug} />
            <ReadonlyField label="City code" value={initial.city_code} />
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
        <button
          type="submit"
          className={styles.submitButton}
          disabled={submitting || !geo.countryId || !geo.stateId}
        >
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create City"}
        </button>
      </div>
    </form>
  );
}

export function CitiesPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [countryOptions, setCountryOptions] = useState<GeographyOption[]>([]);
  const [stateOptions, setStateOptions] = useState<GeographyOption[]>([]);

  useEffect(() => {
    listCountryOptions()
      .then((res) => setCountryOptions(res.results))
      .catch(() => setCountryOptions([]));
  }, []);

  useEffect(() => {
    if (!countryFilter) {
      // Clearing the parent filter clears its dependent options too.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStateOptions([]);
      return;
    }
    listStateOptions(Number(countryFilter))
      .then((res) => setStateOptions(res.results))
      .catch(() => setStateOptions([]));
  }, [countryFilter]);

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<CityItem>(listCities, search, { country: countryFilter, state: stateFilter });

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CityItem | null>(null);
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

  async function handleDeleteClick(item: CityItem) {
    if (!window.confirm(`Delete city "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteCity(item.id);
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't delete this city. Please try again.");
      }
    }
  }

  async function handleFormSubmit(input: CityInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createCity(input);
      } else if (editingItem) {
        await updateCity(editingItem.id, input);
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
            value={countryFilter}
            onChange={(event) => {
              setCountryFilter(event.target.value);
              setStateFilter("");
            }}
          >
            <option value="">All countries</option>
            {countryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={stateFilter}
            disabled={!countryFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">All states</option>
            {stateOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
          + Add City
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>State</th>
              <th>Country</th>
              <th>Code</th>
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
                  No cities found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.primaryText}>{item.name}</td>
                  <td className={styles.parentChain}>{item.state.name}</td>
                  <td className={styles.parentChain}>{item.country.name}</td>
                  <td className={styles.codeText}>{item.city_code}</td>
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
          title={modalMode === "create" ? "Add City" : "Edit City"}
          onClose={() => setModalMode(null)}
        >
          <CityForm
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
