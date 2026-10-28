"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AcceptedOrder,
  BidDetail,
  BidTier,
  acceptBid,
  acceptedTierId,
  getBid,
  rejectBid,
  updateBid,
} from "@/lib/admin-bids-api";
import { AuthError, clearSession } from "@/lib/auth";
import { describeLoadError } from "@/lib/load-error";
import { parseFieldErrors } from "@/lib/use-managed-list";
import { Modal } from "@/components/modal";
import { ReadonlyField } from "../../_shared/readonly-field";
import { formatAmount, formatDateTime } from "../../catalog/listings/listing-utils";
import {
  bidStatusBadgeClass,
  bidStatusLabel,
  jobStatusBadgeClass,
  jobStatusLabel,
  tierText,
} from "../../jobs/job-utils";
import styles from "../../management.module.css";

type Dialog = "accept" | "reject" | "cancel" | null;

function errorText(err: unknown): string {
  const { fieldErrors, message } = parseFieldErrors(err);
  return (
    fieldErrors.price_tier_id?.[0] ??
    fieldErrors.note?.[0] ??
    fieldErrors.status?.[0] ??
    fieldErrors.detail?.[0] ??
    fieldErrors["0"]?.[0] ??
    Object.values(fieldErrors)[0]?.[0] ??
    message ??
    "Something went wrong."
  );
}

export function BidDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [bid, setBid] = useState<BidDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pickedTier, setPickedTier] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [order, setOrder] = useState<AcceptedOrder | null>(null);
  const [reload, setReload] = useState(0);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    getBid(id)
      .then((detail) => {
        if (!cancelled) setBid(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setLoadError(describeLoadError(err, "This bid was not found.", "Couldn't load this bid. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reload]);

  function open(kind: Exclude<Dialog, null>) {
    setDialogError(null);
    setReason("");
    setPickedTier(null);
    setDialog(kind);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setDialogError(null);
    try {
      await action();
      setDialog(null);
      setReload((n) => n + 1);
    } catch (err) {
      if (!handleAuthError(err)) setDialogError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function submitAccept(event: React.FormEvent) {
    event.preventDefault();
    if (!bid) return;
    const multi = bid.price_tiers.length > 1;
    if (multi && pickedTier == null) {
      setDialogError("Pick the price option you are accepting.");
      return;
    }
    void run(async () => {
      const res = await acceptBid(id, multi ? (pickedTier as number) : undefined);
      setOrder(res.order);
    });
  }

  function submitReject(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim() === "") {
      setDialogError("A reason is required.");
      return;
    }
    void run(async () => {
      await rejectBid(id, reason.trim());
      setOrder(null);
    });
  }

  function submitCancel(event: React.FormEvent) {
    event.preventDefault();
    void run(async () => {
      await updateBid(id, { status: "cancelled" });
    });
  }

  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !bid) {
    return (
      <div>
        <button type="button" className={styles.backLink} onClick={() => router.push("/admin/bidding")}>
          ← Back to Bidding
        </button>
        <p className={styles.errorBanner}>{loadError ?? "Bid not found."}</p>
      </div>
    );
  }

  const hiredTierId = acceptedTierId(bid);
  const pending = bid.status === "pending";
  const accepted = bid.status === "accepted";
  const tierRow = (tier: BidTier) => (
    <tr key={tier.id}>
      <td>{tier.price_type}</td>
      <td>{tierText(tier.price, tier.price_type)}</td>
      <td>{tier.duration}</td>
      <td className={styles.primaryText}>{formatAmount(tier.total_price)}</td>
      <td className={styles.secondaryText}>{tier.description ?? "—"}</td>
      <td>{hiredTierId === tier.id ? <span className={`${styles.badge} ${styles.badgeGreen}`}>Hired</span> : null}</td>
    </tr>
  );

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/bidding")}>
        ← Back to Bidding
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>Bid #{bid.id}</h1>
          <p className={styles.subtitle}>
            {bid.bidder.name} on <Link href={`/admin/jobs/${bid.job.id}`}>{bid.job.title}</Link>
          </p>
          <div className={styles.detailBadgeRow}>
            <span className={`${styles.badge} ${bidStatusBadgeClass(bid.status)}`}>
              {bidStatusLabel(bid.status)}
            </span>
            <span className={`${styles.badge} ${jobStatusBadgeClass(bid.job.status)}`}>
              Job: {jobStatusLabel(bid.job.status)}
            </span>
          </div>
        </div>
        <div className={styles.rowActions}>
          {pending && (
            <>
              <button type="button" className={styles.approveButton} onClick={() => open("accept")}>
                Accept
              </button>
              <button type="button" className={styles.actionButton} onClick={() => router.push(`/admin/bidding/${id}/edit`)}>
                Update
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                onClick={() => open("cancel")}
              >
                Cancel bid
              </button>
            </>
          )}
          {accepted && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
              onClick={() => open("reject")}
            >
              Reject (undo hire)
            </button>
          )}
        </div>
      </div>

      {order && (
        <p className={styles.noticeBanner}>
          Bid accepted. Order #{order.id} was created ({order.status.replace("_", " ")}), payable{" "}
          {formatAmount(order.payable)}. There is no order screen yet, so this is the only place it is
          shown.
        </p>
      )}

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Bid</h2>
        <div className={styles.formGrid}>
          <ReadonlyField label="Seller" value={`${bid.bidder.name} · ${bid.bidder.phone}`} />
          <ReadonlyField label="Job" value={`${bid.job.title} (#${bid.job.id})`} />
          <div className={styles.formGridFull}>
            <ReadonlyField label="Message" value={bid.description ?? "—"} />
          </div>
          <ReadonlyField label="Proposed start" value={bid.proposed_start ? formatDateTime(bid.proposed_start) : "—"} />
          <ReadonlyField label="Proposed end" value={bid.proposed_end ? formatDateTime(bid.proposed_end) : "—"} />
          <ReadonlyField label="Actual start" value={bid.actual_start_date ? formatDateTime(bid.actual_start_date) : "—"} />
          <ReadonlyField label="Actual end" value={bid.actual_end_date ? formatDateTime(bid.actual_end_date) : "—"} />
          <ReadonlyField label="Placed" value={formatDateTime(bid.created_at)} />
          <ReadonlyField label="Last changed" value={formatDateTime(bid.updated_at)} />
          {bid.note && (
            <div className={styles.formGridFull}>
              <ReadonlyField label="Note" value={bid.note} />
            </div>
          )}
        </div>
        <p className={styles.fieldHint}>
          <Link href={`/admin/jobs/${bid.job.id}`}>Open the job</Link> ·{" "}
          <Link href={`/admin/bidding?listing=${bid.job.id}`}>All bids on this job</Link> ·{" "}
          <Link href={`/admin/sellers/${bid.bidder.id}`}>Open the seller</Link>
        </p>
      </div>

      <div className={styles.detailCard}>
        <h2 className={styles.detailCardTitle}>Price options</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Total</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>{bid.price_tiers.map(tierRow)}</tbody>
          </table>
        </div>
      </div>

      {dialog === "accept" && (
        <Modal title="Accept this bid" onClose={() => !busy && setDialog(null)}>
          <form onSubmit={submitAccept}>
            <p className={styles.fieldHint}>
              Hires {bid.bidder.name} on the buyer&apos;s behalf. The job moves to in progress, every
              other pending bid is rejected and an order is created.
            </p>
            {bid.price_tiers.length > 1 ? (
              <div className={styles.field}>
                <span className={styles.label}>Which price option is the buyer accepting?</span>
                {bid.price_tiers.map((tier) => (
                  <label key={tier.id} className={styles.checkboxField}>
                    <input
                      type="radio"
                      name="tier"
                      checked={pickedTier === tier.id}
                      onChange={() => setPickedTier(tier.id)}
                    />
                    {tierText(tier.price, tier.price_type)} × {tier.duration} = {formatAmount(tier.total_price)}
                  </label>
                ))}
              </div>
            ) : (
              <p>
                Price: <strong>{formatAmount(bid.price_tiers[0]?.total_price ?? "0")}</strong>
              </p>
            )}
            {dialogError && <p className={styles.fieldError}>{dialogError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDialog(null)} disabled={busy}>
                Close
              </button>
              <button type="submit" className={styles.submitButton} disabled={busy}>
                {busy ? "Accepting…" : "Accept bid"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog === "reject" && (
        <Modal title="Undo this hire" onClose={() => !busy && setDialog(null)}>
          <form onSubmit={submitReject}>
            <p className={styles.fieldHint}>
              The bid becomes rejected, its order is cancelled and the job opens for bids again. Bids
              that lost earlier stay rejected.
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bid-reject-reason">
                Reason (required)
              </label>
              <textarea
                id="bid-reject-reason"
                className={styles.textarea}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              {dialogError && <p className={styles.fieldError}>{dialogError}</p>}
            </div>
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDialog(null)} disabled={busy}>
                Close
              </button>
              <button type="submit" className={styles.dangerButton} disabled={busy}>
                {busy ? "Rejecting…" : "Reject bid"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog === "cancel" && (
        <Modal title="Cancel this bid" onClose={() => !busy && setDialog(null)}>
          <form onSubmit={submitCancel}>
            <p className={styles.fieldHint}>
              The bid is withdrawn on the seller&apos;s behalf. The seller can place a new bid later.
            </p>
            {dialogError && <p className={styles.fieldError}>{dialogError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDialog(null)} disabled={busy}>
                Keep bid
              </button>
              <button type="submit" className={styles.dangerButton} disabled={busy}>
                {busy ? "Cancelling…" : "Cancel bid"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
