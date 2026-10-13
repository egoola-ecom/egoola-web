"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import {
  BuyerInput,
  BuyerListItem,
  BuyerStatus,
  createBuyer,
  deleteBuyer,
  listBuyers,
} from "@/lib/accounts-api";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors, parseFieldErrors, useManagedList } from "@/lib/use-managed-list";
import { GeographyFields } from "../_shared/geography-fields";
import { initials } from "../_shared/profile-sections";
import { formatMoney } from "../_shared/readonly-field";
import { BuyerForm } from "./buyer-form";
import styles from "../management.module.css";

function statusBadgeClass(status: BuyerStatus): string {
  return status === "active" ? styles.badgeGreen : styles.badgeRed;
}

export function BuyersClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [emailVerified, setEmailVerified] = useState("");
  const [phoneVerified, setPhoneVerified] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const geo = useGeographySelection({});

  const { items, count, loading, error, offset, setOffset, pageSize, refetch } =
    useManagedList<BuyerListItem>(listBuyers, search, {
      status: statusFilter,
      email_verified: emailVerified,
      phone_verified: phoneVerified,
      created_from: createdFrom,
      created_to: createdTo,
      country: geo.countryId != null ? String(geo.countryId) : undefined,
      state: geo.stateId != null ? String(geo.stateId) : undefined,
      city: geo.cityId != null ? String(geo.cityId) : undefined,
      thana: geo.thanaId != null ? String(geo.thanaId) : undefined,
    });

  const filtersActive = Boolean(
    statusFilter ||
      emailVerified ||
      phoneVerified ||
      createdFrom ||
      createdTo ||
      geo.countryId != null,
  );

  function clearFilters() {
    setStatusFilter("");
    setEmailVerified("");
    setPhoneVerified("");
    setCreatedFrom("");
    setCreatedTo("");
    geo.selectCountry(null);
  }

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

  async function handleDeleteClick(item: BuyerListItem) {
    if (!window.confirm(`Delete buyer "${item.name}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteBuyer(item.id);
      refetch();
    } catch (err) {
      if (handleAuthError(err)) return;
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? (err.body as Record<string, unknown>).detail
          : null;
      setActionError(
        typeof detail === "string" ? detail : "Couldn't delete this buyer. Please try again.",
      );
    }
  }

  async function handleFormSubmit(input: BuyerInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await createBuyer(input);
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
          <h1 className={styles.title}>Buyers</h1>
          <p className={styles.subtitle}>Buyer accounts and their active/suspended status.</p>
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
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by email verification"
            value={emailVerified}
            onChange={(event) => setEmailVerified(event.target.value)}
          >
            <option value="">Email: any</option>
            <option value="true">Email verified</option>
            <option value="false">Email not verified</option>
          </select>
          <select
            className={styles.filterSelect}
            aria-label="Filter by phone verification"
            value={phoneVerified}
            onChange={(event) => setPhoneVerified(event.target.value)}
          >
            <option value="">Phone: any</option>
            <option value="true">Phone verified</option>
            <option value="false">Phone not verified</option>
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
          + Add Buyer
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.secondaryText} htmlFor="buyer-created-from">
            Signed up from
          </label>
          <input
            id="buyer-created-from"
            type="date"
            className={styles.filterSelect}
            value={createdFrom}
            max={createdTo || undefined}
            onChange={(event) => setCreatedFrom(event.target.value)}
          />
          <label className={styles.secondaryText} htmlFor="buyer-created-to">
            to
          </label>
          <input
            id="buyer-created-to"
            type="date"
            className={styles.filterSelect}
            value={createdTo}
            min={createdFrom || undefined}
            onChange={(event) => setCreatedTo(event.target.value)}
          />
          {filtersActive && (
            <button type="button" className={styles.actionButton} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <GeographyFields geo={geo} idPrefix="buyer-filter-geo" />
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Wallet</th>
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
                  No buyers found.
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
                        onClick={() => router.push(`/admin/buyers/${item.id}`)}
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

      {modalOpen && (
        <Modal title="Add Buyer" onClose={() => setModalOpen(false)}>
          <BuyerForm
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
