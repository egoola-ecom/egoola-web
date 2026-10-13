"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  EmailTemplateInput,
  EmailTemplateItem,
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "@/lib/cms-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { ReadonlyField } from "../_shared/readonly-field";
import styles from "../management.module.css";

function TemplateForm({
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: EmailTemplateItem | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: EmailTemplateInput) => void;
}) {
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: EmailTemplateInput = {
      subject: String(data.get("subject") ?? "").trim(),
      content: String(data.get("content") ?? ""),
      is_active: isActive,
    };
    // The key is the id application code looks the template up by, so the
    // server only accepts it on create.
    if (!initial) input.key = String(data.get("key") ?? "").trim();
    onSubmit(input);
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
            <label className={styles.label} htmlFor="template-key">
              Key
            </label>
            <input
              id="template-key"
              name="key"
              className={`${styles.input} ${styles.monoText}`}
              placeholder="order_approved"
              required
            />
            <p className={styles.fieldHint}>
              Lowercase letters, digits and underscores, starting with a letter. The application
              finds the template by this key, so it can&apos;t be changed later.
            </p>
            {err("key")}
          </div>
        )}

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="template-subject">
            Subject
          </label>
          <input
            id="template-subject"
            name="subject"
            className={styles.input}
            defaultValue={initial?.subject}
            required
          />
          {err("subject")}
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="template-content">
            Content
          </label>
          <textarea
            id="template-content"
            name="content"
            className={`${styles.textarea} ${styles.codeTextarea}`}
            defaultValue={initial?.content}
            required
          />
          <p className={styles.fieldHint}>
            Use {"{{variables}}"} such as {"{{buyerName}}"} where the application should fill in
            values.
          </p>
          {err("content")}
        </div>

        <div className={styles.checkboxField}>
          <input
            id="template-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <label htmlFor="template-is-active">Active (the application sends this email)</label>
        </div>
        {err("is_active")}
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
          {submitting ? "Saving…" : initial ? "Save Changes" : "Create Template"}
        </button>
      </div>
    </form>
  );
}

export function EmailTemplatesPanel() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<EmailTemplateItem>(listEmailTemplates, search, {
      is_active: activeFilter || undefined,
    });

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<EmailTemplateItem | null>(null);
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

  function openModal(mode: "create" | "edit", item: EmailTemplateItem | null) {
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setModalMode(mode);
  }

  async function handleDeleteClick(item: EmailTemplateItem) {
    if (
      !window.confirm(
        `Delete the "${item.key}" template? The application won't be able to send it any more.`,
      )
    ) {
      return;
    }
    setActionError(null);
    try {
      await deleteEmailTemplate(item.id);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      setActionError("Couldn't delete this template. Please try again.");
    }
  }

  async function handleFormSubmit(input: EmailTemplateInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createEmailTemplate(input);
      } else if (editingItem) {
        await updateEmailTemplate(editingItem.id, input);
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
            placeholder="Search by key or subject"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">All templates</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button type="button" className={styles.addButton} onClick={() => openModal("create", null)}>
          + Add Template
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Updated</th>
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
                  No email templates found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className={`${styles.primaryText} ${styles.monoText}`}>{item.key}</td>
                  <td className={styles.secondaryText}>{item.subject}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${item.is_active ? styles.badgeGreen : styles.badgeGray}`}
                    >
                      {item.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>
                    {new Date(item.updated_at).toLocaleDateString()}
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
          title={modalMode === "create" ? "Add Email Template" : "Edit Email Template"}
          onClose={() => setModalMode(null)}
        >
          <TemplateForm
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
