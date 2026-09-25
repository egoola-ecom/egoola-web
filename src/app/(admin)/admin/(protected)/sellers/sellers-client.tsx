"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  SellerDetail,
  SellerInput,
  SellerListItem,
  SellerStatus,
  SellerVerificationStatus,
  createSeller,
  deleteSeller,
  getSeller,
  listSellers,
  updateSeller,
} from "@/lib/accounts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { SellerForm } from "./seller-form";
import styles from "../management.module.css";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusBadgeClass(status: SellerStatus): string {
  return status === "active" ? styles.badgeGreen : styles.badgeRed;
}

function verificationBadgeClass(status: SellerVerificationStatus): string {
  switch (status) {
    case "verified":
      return styles.badgeGreen;
    case "pending":
      return styles.badgeAmber;
    case "rejected":
      return styles.badgeRed;
    default:
      return styles.badgeGray;
  }
}

function formatMoney(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `৳${amount.toLocaleString()}` : value;
}

export function SellersClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<SellerListItem>(listSellers, search, {
      verification_status: verificationFilter,
      status: statusFilter,
    });

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<SellerDetail | null>(null);
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
      const detail = await getSeller(id);
      setEditingItem(detail);
      setFieldErrors({});
      setFormError(null);
      setModalMode("edit");
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't load this seller's details. Please try again.");
      }
    } finally {
      setDetailLoadingId(null);
    }
  }

  async function handleDeleteClick(item: SellerListItem) {
    if (!window.confirm(`Delete seller "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteSeller(item.id);
      refetch();
    } catch (err) {
      if (!handleAuthError(err)) {
        window.alert("Couldn't delete this seller. Please try again.");
      }
    }
  }

  async function handleFormSubmit(input: SellerInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (modalMode === "create") {
        await createSeller(input);
      } else if (editingItem) {
        await updateSeller(editingItem.id, input);
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
          <h1 className={styles.title}>Sellers</h1>
          <p className={styles.subtitle}>
            Seller accounts, business profiles, verification, and wallet balances.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={verificationFilter}
            onChange={(event) => setVerificationFilter(event.target.value)}
          >
            <option value="">All verification statuses</option>
            <option value="unverified">Unverified</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
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
          + Add Seller
        </button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Verification</th>
              <th>Status</th>
              <th>Wallet</th>
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
                  No sellers found.
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
                  <td>{item.phone}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${verificationBadgeClass(item.verification_status)}`}
                    >
                      {item.verification_status}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${statusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{formatMoney(item.wallet_balance)}</td>
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
          title={modalMode === "create" ? "Add Seller" : "Edit Seller"}
          onClose={() => setModalMode(null)}
        >
          <SellerForm
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
