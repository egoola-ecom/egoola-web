"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  AdminDetail,
  AdminInput,
  AdminListItem,
  AdminStatus,
  createAdmin,
  deleteAdmin,
  getAdmin,
  listAdmins,
  updateAdmin,
} from "@/lib/accounts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { AdminForm } from "./admin-form";
import styles from "../management.module.css";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<AdminDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
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

  async function handleEditClick(id: number) {
    setDetailLoadingId(id);
    try {
      const detail = await getAdmin(id);
      setEditingItem(detail);
      setFieldErrors({});
      setFormError(null);
      setModalMode("edit");
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't load this admin's details. Please try again.");
      }
    } finally {
      setDetailLoadingId(null);
    }
  }

  async function handleDeleteClick(item: AdminListItem) {
    if (!window.confirm(`Delete admin "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteAdmin(item.id);
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't delete this admin. Please try again.");
      }
    }
  }

  async function handleFormSubmit(input: AdminInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createAdmin(input);
      } else if (editingItem) {
        await updateAdmin(editingItem.id, input);
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
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Admins</h1>
          <p className={styles.subtitle}>Admin accounts, roles, and access status.</p>
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
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="support">Support</option>
          </select>
          <select
            className={styles.filterSelect}
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
            setEditingItem(null);
            setFieldErrors({});
            setFormError(null);
            setModalMode("create");
          }}
        >
          + Add Admin
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

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
                        <div className={styles.primaryText}>{item.name}</div>
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
                        onClick={() => handleEditClick(item.id)}
                        disabled={detailLoadingId === item.id}
                      >
                        {detailLoadingId === item.id ? "Loading…" : "Edit"}
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
          title={modalMode === "create" ? "Add Admin" : "Edit Admin"}
          onClose={() => setModalMode(null)}
        >
          <AdminForm
            mode={modalMode}
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
