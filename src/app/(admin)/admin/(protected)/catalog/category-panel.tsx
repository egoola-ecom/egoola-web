"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  CategoryInput,
  CategoryItem,
  CategoryStatus,
  CategoryType,
  createCategory,
  deleteCategory,
  listCategories,
  listCategoryOptions,
  updateCategory,
} from "@/lib/category-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { ReadonlyField } from "../_shared/readonly-field";
import styles from "../management.module.css";

const STATUS_OPTIONS: { value: CategoryStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function statusBadgeClass(status: CategoryStatus): string {
  return status === "active" ? styles.badgeGreen : styles.badgeGray;
}

/** Builds indented "Parent" <select> options from a flat same-type list —
 * a depth-first walk from the top-level roots, prefixing each child with
 * one "— " per nesting level. When editing, `excludeId` and its whole
 * subtree are dropped so the picker can't offer a choice the server would
 * reject as a cycle. */
function buildParentOptions(
  categories: CategoryItem[],
  excludeId?: number,
): { id: number; label: string }[] {
  const excluded = new Set<number>();
  if (excludeId != null) {
    excluded.add(excludeId);
    let added = true;
    while (added) {
      added = false;
      for (const c of categories) {
        if (c.parent != null && excluded.has(c.parent) && !excluded.has(c.id)) {
          excluded.add(c.id);
          added = true;
        }
      }
    }
  }

  const byParent = new Map<number | null, CategoryItem[]>();
  for (const c of categories) {
    if (excluded.has(c.id)) continue;
    const siblings = byParent.get(c.parent) ?? [];
    siblings.push(c);
    byParent.set(c.parent, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  const result: { id: number; label: string }[] = [];
  function walk(parentId: number | null, depth: number) {
    for (const c of byParent.get(parentId) ?? []) {
      result.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
      walk(c.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

function CategoryForm({
  type,
  initial,
  parentOptions,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  type: CategoryType;
  initial?: CategoryItem | null;
  parentOptions: { id: number; label: string }[];
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CategoryInput) => void;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parentValue = String(data.get("parent") ?? "");
    onSubmit({
      type,
      name: String(data.get("name") ?? ""),
      parent: parentValue ? Number(parentValue) : null,
      sort_order: Number(data.get("sort_order") ?? 0),
      status: (data.get("status") as CategoryStatus) ?? "active",
      image: imageFile,
    });
  }

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
            Choose image
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
        {fieldErrors.image?.[0] && (
          <p className={`${styles.fieldError} ${styles.formGridFull}`}>{fieldErrors.image[0]}</p>
        )}

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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="parent">
            Parent category
          </label>
          <select
            id="parent"
            name="parent"
            className={styles.select}
            defaultValue={initial?.parent != null ? String(initial.parent) : ""}
          >
            <option value="">No parent (top-level)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          {fieldErrors.parent?.[0] && (
            <p className={styles.fieldError}>{fieldErrors.parent[0]}</p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="sort_order">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            className={styles.input}
            defaultValue={initial?.sort_order ?? 0}
          />
          {fieldErrors.sort_order?.[0] && (
            <p className={styles.fieldError}>{fieldErrors.sort_order[0]}</p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className={styles.select}
            defaultValue={initial?.status ?? "active"}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Category"}
        </button>
      </div>
    </form>
  );
}

export function CategoryPanel({ type }: { type: CategoryType }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [allOfType, setAllOfType] = useState<CategoryItem[]>([]);

  useEffect(() => {
    listCategoryOptions(type)
      .then((res) => setAllOfType(res.results))
      .catch(() => setAllOfType([]));
  }, [type]);

  const parentNameById = useMemo(
    () => new Map(allOfType.map((c) => [c.id, c.name])),
    [allOfType],
  );

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<CategoryItem>(listCategories, search, { type, status: statusFilter });

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
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

  function refetchAll() {
    refetch();
    listCategoryOptions(type)
      .then((res) => setAllOfType(res.results))
      .catch(() => {});
  }

  async function handleDeleteClick(item: CategoryItem) {
    if (!window.confirm(`Delete category "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory(item.id);
      refetchAll();
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't delete this category. Please try again.");
      }
    }
  }

  async function handleFormSubmit(input: CategoryInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createCategory(input);
      } else if (editingItem) {
        await updateCategory(editingItem.id, input);
      }
      setModalMode(null);
      refetchAll();
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
  const parentOptions = buildParentOptions(allOfType, editingItem?.id);

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
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
          + Add Category
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Parent</th>
              <th>Sort order</th>
              <th>Status</th>
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
                  No categories found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.thumbCell}>
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className={styles.thumb} />
                      )}
                      <span className={styles.primaryText}>{item.name}</span>
                    </div>
                  </td>
                  <td className={styles.parentChain}>
                    {item.parent != null ? (parentNameById.get(item.parent) ?? `#${item.parent}`) : "—"}
                  </td>
                  <td className={styles.codeText}>{item.sort_order}</td>
                  <td>
                    <span className={`${styles.badge} ${statusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
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
          title={modalMode === "create" ? "Add Category" : "Edit Category"}
          onClose={() => setModalMode(null)}
        >
          <CategoryForm
            type={type}
            initial={editingItem}
            parentOptions={parentOptions}
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
