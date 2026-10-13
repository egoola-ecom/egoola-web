"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { RowThumbnail } from "@/components/thumbnail-control";
import { getSeller } from "@/lib/accounts-api";
import { apiErrorDetail } from "@/lib/api";
import {
  CategoryTreeNode,
  getCategoryParentChain,
  getCategoryTree,
} from "@/lib/category-api";
import {
  GigListItem,
  bulkModerateGigs,
  listGigRequests,
  updateGigStatus,
} from "@/lib/gig-api";
import { ListingBulkStatus } from "@/lib/listing-api";
import { notifyPendingGigsChanged, usePendingGigCount } from "@/lib/pending-gig-count";
import { useCursorList } from "@/lib/use-cursor-list";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { AuthError, clearSession } from "@/lib/auth";
import { formatDateTime } from "../../catalog/listings/listing-utils";
import { SellerFilterPicker } from "../../catalog/listings/seller-filter-picker";
import { PRICE_TYPE_OPTIONS, RateDisplay } from "../gig-utils";
import styles from "../../management.module.css";

/** `requested_at` for a gig that was created and never sent back is the
 * same moment as `created_at`; "clearly later" (over a minute) means the
 * seller fixed it after a rejection. */
const RESUBMIT_GAP_MS = 60_000;

const SORT_OPTIONS = [
  { value: "-requested_at", label: "Newest request" },
  { value: "requested_at", label: "Oldest request" },
  { value: "-created_at", label: "Newest created" },
  { value: "created_at", label: "Oldest created" },
  { value: "title", label: "Title A to Z" },
  { value: "-title", label: "Title Z to A" },
];

interface Decision {
  status: "rejected" | "changes_requested";
  /** One listing, or null for the ticked ones. */
  item: GigListItem | null;
}

function flatten(nodes: CategoryTreeNode[], depth = 0): { id: number; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"  ".repeat(depth)}${node.name}` },
    ...flatten(node.children, depth + 1),
  ]);
}

/** The admin's queue of gigs waiting for a decision. Cursor-paged:
 * "Load more" follows the server's `next` link and there is no total; the
 * number in the heading is the menu badge's count. */
export function GigRequestsClient() {
  const router = useRouter();
  const waiting = usePendingGigCount(true);

  const [search, setSearch] = useState("");
  const [seller, setSeller] = useState("");
  const [priceType, setPriceType] = useState("");
  const [category, setCategory] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [ordering, setOrdering] = useState("-requested_at");
  const [moreFilters, setMoreFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filters = {
    seller,
    price_type: priceType,
    category,
    created_from: createdFrom,
    created_to: createdTo,
    requested_from: requestedFrom,
    requested_to: requestedTo,
    ordering,
  };
  const { items, loading, loadingMore, error, hasMore, loadMore, refetch } =
    useCursorList<GigListItem>(listGigRequests, debouncedSearch, filters);

  const anyFilter = Boolean(
    debouncedSearch ||
      seller ||
      priceType ||
      category ||
      createdFrom ||
      createdTo ||
      requestedFrom ||
      requestedTo,
  );

  // Names for the ids the rows carry.
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; label: string }[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<number, string>>({});
  const [sellerNames, setSellerNames] = useState<Record<number, string>>({});
  const askedSellers = useRef(new Set<number>());

  useEffect(() => {
    getCategoryTree({ type: "service" })
      .then((services) => setCategoryOptions(flatten(services)))
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    const ids = Array.from(new Set(items.map((item) => item.category)));
    if (ids.length === 0) return;
    let cancelled = false;
    getCategoryParentChain(ids)
      .then((chains) => {
        if (cancelled) return;
        const names: Record<number, string> = {};
        for (const chain of chains) {
          names[chain.id] = [...chain.parents, chain].map((c) => c.name).join(" › ");
        }
        setCategoryNames((prev) => ({ ...prev, ...names }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    for (const item of items) {
      const id = item.seller;
      if (id == null || askedSellers.current.has(id)) continue;
      askedSellers.current.add(id);
      getSeller(id)
        .then((s) => setSellerNames((prev) => ({ ...prev, [id]: s.name })))
        .catch(() => {});
    }
  }, [items]);

  // Selection, a decision that needs a reason, and the result of the last one.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErrors, setReasonErrors] = useState<FieldErrors>({});
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<ListingBulkStatus>("approved");
  const titles = useRef(new Map<number, string>());

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  function afterDecision(message: string) {
    setNotice(message);
    setSelected(new Set());
    refetch();
    notifyPendingGigsChanged();
  }

  async function approveOne(item: GigListItem) {
    if (!window.confirm(`Approve "${item.title}"? Buyers will be able to see it.`)) return;
    setNotice(null);
    setActionError(null);
    setBusy(true);
    try {
      await updateGigStatus(item.id, { status: "approved" });
      afterDecision(`Approved "${item.title}".`);
    } catch (err) {
      if (!handleAuthError(err)) {
        setActionError(apiErrorDetail(err) ?? parseFieldErrors(err).message ?? "Couldn't approve this gig.");
      }
    } finally {
      setBusy(false);
    }
  }

  function openDecision(next: Decision) {
    setDecision(next);
    setReason("");
    setReasonErrors({});
    setReasonError(null);
  }

  async function submitDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    const note = reason.trim();
    if (!note) {
      setReasonError(
        decision.status === "rejected"
          ? "Write a reason. The seller reads it to know what to fix."
          : "Write what the seller should change.",
      );
      return;
    }
    setBusy(true);
    setReasonError(null);
    setReasonErrors({});
    setNotice(null);
    try {
      const verb = decision.status === "rejected" ? "Rejected" : "Asked for changes on";
      if (decision.item) {
        await updateGigStatus(decision.item.id, { status: decision.status, note });
        afterDecision(`${verb} "${decision.item.title}".`);
      } else {
        const result = await bulkModerateGigs({
          listing_ids: Array.from(selected),
          status: decision.status,
          note,
        });
        afterDecision(
          `${verb} ${result.updated.length} gig${result.updated.length === 1 ? "" : "s"}` +
            (result.skipped.length > 0 ? `, ${result.skipped.length} skipped (already in that status).` : "."),
        );
      }
      setDecision(null);
    } catch (err) {
      if (!handleAuthError(err)) {
        const parsed = parseFieldErrors(err);
        setReasonErrors(parsed.fieldErrors);
        setReasonError(parsed.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function applyBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bulkStatus === "approved") {
      setBusy(true);
      setNotice(null);
      setActionError(null);
      try {
        const result = await bulkModerateGigs({
          listing_ids: Array.from(selected),
          status: "approved",
        });
        afterDecision(
          `Approved ${result.updated.length} gig${result.updated.length === 1 ? "" : "s"}` +
            (result.skipped.length > 0 ? `, ${result.skipped.length} skipped.` : "."),
        );
      } catch (err) {
        if (!handleAuthError(err)) {
          setActionError(apiErrorDetail(err) ?? parseFieldErrors(err).message ?? "Couldn't approve these gigs.");
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    openDecision({ status: bulkStatus, item: null });
  }

  function toggle(item: GigListItem) {
    titles.current.set(item.id, item.title);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const dateFields = [
    ["Created from", createdFrom, setCreatedFrom],
    ["Created to", createdTo, setCreatedTo],
    ["Requested from", requestedFrom, setRequestedFrom],
    ["Requested to", requestedTo, setRequestedTo],
  ] as const;

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Pending Gigs{waiting != null ? ` (${waiting})` : ""}</h1>
          <p className={styles.subtitle}>
            Gigs sellers created or fixed after a rejection, waiting for a decision. A gig a seller
            fixed jumps back to the top.
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search pending gigs"
            placeholder="Search title, Bangla title or package code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <SellerFilterPicker value={seller} onChange={setSeller} />
          <select
            className={styles.filterSelect}
            aria-label="Sort requests"
            value={ordering}
            onChange={(event) => setOrdering(event.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.actionButton}
            aria-expanded={moreFilters}
            onClick={() => setMoreFilters(!moreFilters)}
          >
            {moreFilters ? "Fewer filters" : "More filters"}
          </button>
        </div>
      </div>

      {moreFilters && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <select
              className={styles.filterSelect}
              aria-label="Filter by price type"
              value={priceType}
              onChange={(event) => setPriceType(event.target.value)}
            >
              <option value="">All price types</option>
              {PRICE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {dateFields.map(([label, value, setValue]) => (
              <label key={label} className={styles.secondaryText}>
                {label}{" "}
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className={styles.errorBanner}>{error}</p>}
      {actionError && <p className={styles.errorBanner}>{actionError}</p>}
      {notice && <p className={styles.noticeBanner}>{notice}</p>}

      {selected.size > 0 && (
        <form className={styles.bulkBar} onSubmit={applyBulk}>
          <span className={styles.bulkBarCount}>{selected.size} selected</span>
          <select
            className={styles.filterSelect}
            aria-label="Bulk action"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value as ListingBulkStatus)}
          >
            <option value="approved">Approve</option>
            <option value="changes_requested">Request changes</option>
            <option value="rejected">Reject</option>
          </select>
          <button type="submit" className={styles.submitButton} disabled={busy}>
            {bulkStatus === "approved" ? (busy ? "Approving…" : "Approve selected") : "Continue…"}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => setSelected(new Set())}
            disabled={busy}
          >
            Clear
          </button>
        </form>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCell}>
                <input
                  type="checkbox"
                  aria-label="Select all gigs shown"
                  checked={allSelected}
                  disabled={items.length === 0}
                  onChange={() => {
                    for (const item of items) titles.current.set(item.id, item.title);
                    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
                  }}
                />
              </th>
              <th></th>
              <th>Gig</th>
              <th>Seller</th>
              <th>Category</th>
              <th>From</th>
              <th>Requested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.stateRow}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.stateRow}>
                  {anyFilter
                    ? "No pending gigs match these filters."
                    : "Nothing is waiting. New gigs from sellers appear here."}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const resubmitted =
                  item.requested_at != null &&
                  new Date(item.requested_at).getTime() - new Date(item.created_at).getTime() >
                    RESUBMIT_GAP_MS;
                return (
                  <tr key={item.id}>
                    <td className={styles.checkCell}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.title}`}
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item)}
                      />
                    </td>
                    <td>
                      <RowThumbnail url={item.image_url} />
                    </td>
                    <td>
                      <div className={styles.primaryText}>
                        {item.title}
                        {resubmitted && (
                          <span
                            className={`${styles.badge} ${styles.badgeAmber}`}
                            style={{ marginLeft: "0.5rem" }}
                            title="The seller fixed this gig after a rejection or a request for changes and sent it again."
                          >
                            Resubmitted
                          </span>
                        )}
                      </div>
                      {item.title_bn && <div className={styles.secondaryText}>{item.title_bn}</div>}
                    </td>
                    <td className={styles.secondaryText}>
                      {item.seller != null ? (sellerNames[item.seller] ?? `#${item.seller}`) : "—"}
                    </td>
                    <td className={styles.secondaryText}>
                      {categoryNames[item.category] ?? `#${item.category}`}
                    </td>
                    <td>
                      <RateDisplay
                        price={item.price}
                        discountedPrice={item.discounted_price}
                        priceType={item.price_type}
                        from
                      />
                    </td>
                    <td className={styles.secondaryText}>
                      {formatDateTime(item.requested_at ?? item.created_at)}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => router.push(`/admin/gigs/${item.id}?from=requests`)}
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          disabled={busy}
                          onClick={() => approveOne(item)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className={styles.actionButton}
                          disabled={busy}
                          onClick={() => openDecision({ status: "changes_requested", item })}
                        >
                          Request changes
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          disabled={busy}
                          onClick={() => openDecision({ status: "rejected", item })}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          {loading
            ? ""
            : `${items.length} gig${items.length === 1 ? "" : "s"} shown${hasMore ? " — more available" : ""}`}
        </span>
        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={!hasMore || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? "Loading…" : hasMore ? "Load more" : "No more gigs"}
          </button>
        </div>
      </div>

      {decision && (
        <Modal
          title={decision.status === "rejected" ? "Reject gig" : "Request changes"}
          onClose={() => (busy ? undefined : setDecision(null))}
        >
          <form onSubmit={submitDecision}>
            <p className={styles.subtitle}>
              {decision.item
                ? `“${decision.item.title}”`
                : `${selected.size} selected gig${selected.size === 1 ? "" : "s"}`}
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="decision-reason">
                {decision.status === "rejected"
                  ? "Why is it rejected? (required)"
                  : "What should the seller change? (required)"}
              </label>
              <textarea
                id="decision-reason"
                className={styles.textarea}
                value={reason}
                autoFocus
                onChange={(event) => setReason(event.target.value)}
              />
              <p className={styles.fieldHint}>The seller sees this reason on the gig.</p>
              {(reasonErrors.note ?? reasonErrors.status)?.map((message) => (
                <p key={message} className={styles.fieldError}>
                  {message}
                </p>
              ))}
            </div>
            {reasonError && <p className={styles.errorBanner}>{reasonError}</p>}
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setDecision(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={decision.status === "rejected" ? styles.dangerButton : styles.submitButton}
                disabled={busy}
              >
                {busy ? "Saving…" : decision.status === "rejected" ? "Reject" : "Request changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

