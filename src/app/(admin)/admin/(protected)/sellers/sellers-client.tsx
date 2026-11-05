"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  SellerInput,
  SellerListItem,
  createSeller,
  SellerStatus,
  deleteSeller,
  listSellers,
  updateSellerReview,
} from "@/lib/accounts-api";
import { apiErrorDetail, isConflict } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { notifySellerRequestsChanged, useSellerRequestCount } from "@/lib/seller-request-count";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import {
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  VERIFICATION_LABELS,
  initials,
  statusBadgeClass,
  verificationBadgeClass,
} from "./seller-badges";
import { SellerFilterBar, useSellerFilters } from "./seller-filters";
import { SellerForm } from "./seller-form";
import styles from "../management.module.css";

function formatMoney(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `৳${amount.toLocaleString()}` : value;
}

export function SellersClient() {
  const router = useRouter();
  const f = useSellerFilters();
  const requestCount = useSellerRequestCount(true);

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<SellerListItem>(listSellers, f.search, f.filters);

  const [modalMode, setModalMode] = useState<"create" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // A refused delete (409: the seller has orders): the server's reason, and the
  // seller it was about, so the admin can deactivate or suspend instead.
  const [conflict, setConflict] = useState<{ item: SellerListItem; message: string } | null>(null);
  const [moving, setMoving] = useState(false);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  async function handleDeleteClick(item: SellerListItem) {
    if (!window.confirm(
        `Delete seller "${item.name}"? This permanently deletes the seller and their uploaded documents.`,
      )) return;
    setActionError(null);
    setConflict(null);
    try {
      await deleteSeller(item.id);
      refetch();
      notifySellerRequestsChanged();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = apiErrorDetail(err) ?? "Couldn't delete this seller. Please try again.";
      if (isConflict(err)) setConflict({ item, message });
      else setActionError(message);
    }
  }

  /** Deactivate or suspend the seller whose delete was refused. */
  async function moveConflicting(status: SellerStatus) {
    if (!conflict) return;
    setMoving(true);
    try {
      await updateSellerReview(conflict.item.id, { status });
      setConflict(null);
      refetch();
      notifySellerRequestsChanged();
    } catch (err) {
      if (handleAuthError(err)) return;
      setConflict(null);
      setActionError(apiErrorDetail(err) ?? "Couldn't change this seller's status.");
    } finally {
      setMoving(false);
    }
  }

  async function handleFormSubmit(input: SellerInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await createSeller(input);
      setModalMode(null);
      refetch();
      notifySellerRequestsChanged();
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

      <SellerFilterBar
        f={f}
        idPrefix="seller-filter"
        showCreatorType
        dateKind="signup"
        trailing={
          <div className={styles.toolbarLeft}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => router.push("/admin/sellers/requests")}
            >
              Seller Requests{requestCount != null ? ` (${requestCount})` : ""}
            </button>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => {
                setFieldErrors({});
                setFormError(null);
                setModalMode("create");
              }}
            >
              + Add Seller
            </button>
          </div>
        }
      />

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {conflict && (
        <p className={styles.errorBanner} role="alert" data-testid="seller-delete-conflict">
          {conflict.message}{" "}
          {conflict.item.status !== "inactive" && (
            <button type="button" className={styles.actionButton} disabled={moving} onClick={() => void moveConflicting("inactive")}>
              Deactivate instead
            </button>
          )}{" "}
          {conflict.item.status !== "suspended" && (
            <button type="button" className={styles.actionButton} disabled={moving} onClick={() => void moveConflicting("suspended")}>
              Suspend instead
            </button>
          )}{" "}
          <button type="button" className={styles.actionButton} onClick={() => setConflict(null)}>
            Dismiss
          </button>
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Verification</th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Signed up</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.stateRow}>
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
                        <div className={styles.primaryText}>
                          {item.name}
                          {item.is_seller_request && (
                            <span className={`${styles.badge} ${styles.badgeAmber}`} style={{ marginLeft: "0.5rem" }}>
                              Request
                            </span>
                          )}
                        </div>
                        <div className={styles.secondaryText}>{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{item.phone}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${verificationBadgeClass(item.verification_status)}`}
                    >
                      {VERIFICATION_LABELS[item.verification_status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${statusBadgeClass(item.status)}`}
                      title={STATUS_LABELS[item.status]}
                    >
                      {STATUS_SHORT_LABELS[item.status]}
                    </span>
                  </td>
                  <td>{formatMoney(item.wallet_balance)}</td>
                  <td className={styles.secondaryText}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => router.push(`/admin/sellers/${item.id}`)}
                      >
                        View Details
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
        <Modal title="Add Seller" onClose={() => setModalMode(null)}>
          <SellerForm
            mode="create"
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
