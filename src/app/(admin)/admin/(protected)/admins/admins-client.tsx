"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  AdminInput,
  AdminListItem,
  AdminStatus,
  createAdmin,
  deleteAdmin,
  listAdmins,
} from "@/lib/accounts-api";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession, getSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { initials } from "../_shared/profile-sections";
import { AdminForm } from "./admin-form";
import styles from "../management.module.css";

function statusBadgeClass(status: AdminStatus): string {
  return status === "active" ? styles.badgeGreen : styles.badgeGray;
}

export function AdminsClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<AdminListItem>(listAdmins, search, {
      type: typeFilter,
      status: statusFilter,
    });

  // You can't delete (or change the role/status of) your own account, so the
  // list marks your own row and leaves its Delete button out.
  const [selfId] = useState(() => getSession("admin")?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
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

  async function handleDeleteClick(item: AdminListItem) {
    if (!window.confirm(`Delete admin "${item.name}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteAdmin(item.id);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? (err.body as Record<string, unknown>).detail
          : null;
      setActionError(
        typeof detail === "string" ? detail : "Couldn't delete this admin. Please try again.",
      );
    }
  }

  async function handleFormSubmit(input: AdminInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await createAdmin(input);
      setModalOpen(false);
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
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Admins</h1>
          <p className={styles.subtitle}>
            Admin accounts, roles, and access status. Only super-admins can manage admins.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search by name, email, or mobile"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            aria-label="Filter by role"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            setFieldErrors({});
            setFormError(null);
            setModalOpen(true);
          }}
        >
          + Add Admin
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last login</th>
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
                  No admins found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.avatar}>
                        {item.profile_pic_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveMediaUrl(item.profile_pic_url) ?? undefined} alt="" />
                        ) : (
                          initials(item.name)
                        )}
                      </span>
                      <div>
                        <div className={styles.primaryText}>
                          {item.name}
                          {item.id === selfId && (
                            <span className={styles.secondaryText}> (you)</span>
                          )}
                        </div>
                        <div className={styles.secondaryText}>{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{item.mobile}</td>
                  <td style={{ textTransform: "capitalize" }}>{item.type.replace("_", " ")}</td>
                  <td>
                    <span className={`${styles.badge} ${statusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className={styles.secondaryText}>
                    {item.last_logged_at ? new Date(item.last_logged_at).toLocaleString() : "Never"}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/admins/${item.id}`)}
                      >
                        View Details
                      </button>
                      {item.id !== selfId && (
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          onClick={() => handleDeleteClick(item)}
                        >
                          Delete
                        </button>
                      )}
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

      {modalOpen && (
        <Modal title="Add Admin" onClose={() => setModalOpen(false)}>
          <AdminForm
            mode="create"
            fieldErrors={fieldErrors}
            formError={formError}
            submitting={submitting}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleFormSubmit}
          />
        </Modal>
      )}
    </div>
  );
}
