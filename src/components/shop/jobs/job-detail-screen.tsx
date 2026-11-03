"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acceptBid,
  getJob,
  jobProblem,
  listBids,
  updateJob,
  type AcceptResult,
  type BuyerBid,
  type Job,
  type JobStatus,
} from "@/lib/buyer/buyer-jobs-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { isInvalidPage } from "@/lib/buyer/public-fetch";
import type { PageResult } from "@/lib/buyer/types";
import { Pager } from "../browse/pager";
import { PRICE_UNIT, taka } from "../money";
import { SHOP } from "../shop-links";
import { BID_STATUS, JobStatusBadge, dateText } from "./job-status";

const BID_PAGE_SIZE = 10;
const priceText = (price: string, type: string) =>
  `${taka(price)}${type === "fixed" ? "" : ` / ${PRICE_UNIT[type] ?? type}`}`;

function BidCard({
  bid,
  canAccept,
  busy,
  onAccept,
}: {
  bid: BuyerBid;
  canAccept: boolean;
  busy: boolean;
  onAccept: (bid: BuyerBid, tierId?: number) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [tier, setTier] = useState<number | null>(null);
  const multi = bid.price_tiers.length > 1;

  return (
    <div className="bg-white border rounded p-3 mb-2" data-testid="bid-row" data-bid-id={bid.id}>
      <div className="d-flex justify-content-between flex-wrap">
        <strong>{bid.bidder.name}</strong>
        <span className={`badge ${BID_STATUS[bid.status] ?? "badge-light"} p-2`} data-testid="bid-status">
          {bid.status}
        </span>
      </div>
      <div className="small text-muted">Bid placed {dateText(bid.created_at)}</div>
      {bid.description && <p className="mt-2 mb-2">{bid.description}</p>}
      <ul className="list-unstyled small mb-2" data-testid="bid-tiers">
        {bid.price_tiers.map((t) => (
          <li key={t.id}>
            {multi && canAccept && asking && (
              <input
                type="radio"
                name={`tier-${bid.id}`}
                aria-label={`Option ${t.price_type}`}
                checked={tier === t.id}
                onChange={() => setTier(t.id)}
                className="mr-1"
              />
            )}
            {priceText(t.price, t.price_type)}
            {t.price_type !== "fixed" && ` × ${t.duration} = ${taka(t.total_price)}`}
            {t.description && <span className="text-muted"> — {t.description}</span>}
            {bid.accepted_price_tier?.id === t.id && <span className="badge badge-success ml-2">Hired option</span>}
          </li>
        ))}
      </ul>
      {(bid.proposed_start || bid.proposed_end) && (
        <div className="small text-muted mb-2">
          Proposed: {dateText(bid.proposed_start)} to {dateText(bid.proposed_end)}
        </div>
      )}
      {bid.status === "pending" && canAccept && (
        <div>
          {!asking ? (
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={() => (multi ? setAsking(true) : onAccept(bid))}
            >
              Accept
            </button>
          ) : (
            <>
              <p className="small mb-1">This bid has more than one option. Choose the one you are accepting.</p>
              <button
                type="button"
                className="btn btn-success btn-sm mr-2"
                disabled={busy || tier === null}
                onClick={() => onAccept(bid, tier ?? undefined)}
              >
                Accept this option
              </button>
              <button type="button" className="btn btn-light btn-sm border" onClick={() => setAsking(false)}>
                Back
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function JobDetailScreen({ id }: { id: number }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bids, setBids] = useState<PageResult<BuyerBid> | null>(null);
  const [bidPage, setBidPage] = useState(1);
  const [bidStatus, setBidStatus] = useState("");
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"cancel" | "complete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hired, setHired] = useState<AcceptResult | null>(null);

  const signedOut = useCallback(() => router.replace(loginUrlFor(window.location.pathname)), [router]);

  const loadJob = useCallback(async () => {
    try {
      setJob(await getJob(id));
    } catch (err) {
      if (isSignedOut(err)) signedOut();
      else setLoadError(jobProblem(err).general);
    }
  }, [id, signedOut]);

  const loadBids = useCallback(
    async (page: number, status: string) => {
      setBidsError(null);
      try {
        setBids(await listBids(id, { status: status || undefined, page, page_size: BID_PAGE_SIZE }));
      } catch (err) {
        if (isSignedOut(err)) signedOut();
        else if (isInvalidPage(err)) setBidPage(1);
        else setBidsError(jobProblem(err).general);
      }
    },
    [id, signedOut],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadJob();
  }, [loadJob]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBids(bidPage, bidStatus);
  }, [loadBids, bidPage, bidStatus]);

  async function move(...steps: JobStatus[]) {
    setBusy(true);
    setActionError(null);
    try {
      for (const status of steps) setJob(await updateJob(id, { status }));
      setConfirming(null);
      await loadBids(bidPage, bidStatus);
    } catch (err) {
      if (isSignedOut(err)) return signedOut();
      const p = jobProblem(err);
      setActionError(p.fields.status ?? p.general);
      await loadJob();
    } finally {
      setBusy(false);
    }
  }

  async function accept(bid: BuyerBid, tierId?: number) {
    setBusy(true);
    setActionError(null);
    try {
      setHired(await acceptBid(id, bid.id, tierId));
      await Promise.all([loadJob(), loadBids(bidPage, bidStatus)]);
    } catch (err) {
      if (isSignedOut(err)) return signedOut();
      const p = jobProblem(err);
      setActionError(Object.values(p.fields)[0] ?? p.general);
      await Promise.all([loadJob(), loadBids(bidPage, bidStatus)]);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="container-fluid p-587 my-3" data-testid="job-error">
        <p className="text-danger" role="alert">
          {loadError}
        </p>
        <Link href={SHOP.jobs}>Back to my jobs</Link>
      </div>
    );
  }
  if (!job) return <p className="text-muted text-center py-5">Loading…</p>;

  const open = job.status === "open_for_bidding";
  const draft = job.status === "draft";
  const reopening = job.status === "pending";
  const canEdit = open || draft || reopening;
  const live = job.skus.filter((t) => t.is_active);

  return (
    <div className="container-fluid p-587 my-3">
      <p className="small mb-2">
        <Link href={SHOP.jobs}>← My jobs</Link>
      </p>

      <div className="bg-white p-4 mb-3">
        <div className="d-flex justify-content-between flex-wrap align-items-start">
          <h4>{job.title}</h4>
          <JobStatusBadge status={job.status} />
        </div>
        <div className="small text-muted mb-3">
          {job.category.name} · posted {dateText(job.created_at)}
          {job.urgent && <span className="badge badge-warning ml-2">Urgent</span>}
          {job.delivery_days ? ` · needed within ${job.delivery_days} ${job.delivery_days === 1 ? "day" : "days"}` : ""}
        </div>
        <p style={{ whiteSpace: "pre-wrap" }}>{job.description}</p>
        {job.package_includes && (
          <p className="small">
            <strong>Includes:</strong> {job.package_includes}
          </p>
        )}
        {(job.available_from || job.available_to) && (
          <p className="small">
            <strong>Available:</strong> {dateText(job.available_from)} to {dateText(job.available_to)}
          </p>
        )}

        <h6 className="font-weight-bold mt-3">Budget</h6>
        <ul className="small" data-testid="job-budget">
          {live.length === 0 && <li>No budget option is active.</li>}
          {live.map((t) => (
            <li key={t.id}>
              {priceText(t.price, t.price_type)}
              {t.description && <span className="text-muted"> — {t.description}</span>}
            </li>
          ))}
        </ul>

        {job.note && (
          <p className="alert alert-info small" data-testid="job-note">
            {job.note}
          </p>
        )}

        {actionError && (
          <p className="alert alert-danger" role="alert" data-testid="action-error">
            {actionError}
          </p>
        )}

        <div data-testid="job-actions">
          {canEdit && (
            <Link className="btn btn-light border btn-sm mr-2" href={SHOP.editJob(job.id)}>
              Edit
            </Link>
          )}
          {open && (
            <button type="button" className="btn btn-light border btn-sm mr-2" disabled={busy} onClick={() => void move("draft")}>
              Pause
            </button>
          )}
          {(draft || reopening) && (
            <button
              type="button"
              className="btn btn-success btn-sm mr-2"
              disabled={busy}
              onClick={() => void move(...(draft ? (["pending", "open_for_bidding"] as const) : (["open_for_bidding"] as const)))}
            >
              Reopen
            </button>
          )}
          {canEdit && confirming !== "cancel" && (
            <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setConfirming("cancel")}>
              Cancel job
            </button>
          )}
          {job.status === "in_progress" && confirming !== "complete" && (
            <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => setConfirming("complete")}>
              Mark complete
            </button>
          )}
        </div>

        {confirming === "cancel" && (
          <div className="alert alert-warning mt-3 mb-0" data-testid="confirm-cancel">
            Cancel this job? Every bid on it will be cancelled too, and this cannot be undone.
            <div className="mt-2">
              <button type="button" className="btn btn-danger btn-sm mr-2" disabled={busy} onClick={() => void move("cancelled")}>
                Yes, cancel the job
              </button>
              <button type="button" className="btn btn-light btn-sm border" onClick={() => setConfirming(null)}>
                Keep it
              </button>
            </div>
          </div>
        )}
        {confirming === "complete" && (
          <div className="alert alert-warning mt-3 mb-0" data-testid="confirm-complete">
            Mark this job as complete? Do this only when the work is done.
            <div className="mt-2">
              <button type="button" className="btn btn-success btn-sm mr-2" disabled={busy} onClick={() => void move("completed")}>
                Yes, it is complete
              </button>
              <button type="button" className="btn btn-light btn-sm border" onClick={() => setConfirming(null)}>
                Not yet
              </button>
            </div>
          </div>
        )}
      </div>

      {hired && (
        <div className="alert alert-success" data-testid="hire-confirmation">
          <strong>{hired.bid.bidder.name}</strong> is hired. Order #<span data-testid="order-id">{hired.order.id}</span> is{" "}
          {hired.order.status.replace(/_/g, " ")}, payable {taka(hired.order.payable)}. Every other pending bid was rejected.
        </div>
      )}
      {job.accepted_bid && !hired && (
        <div className="alert alert-info small" data-testid="accepted-bid">
          Hired: <strong>{job.accepted_bid.bidder.name}</strong>
        </div>
      )}

      <div className="bg-white p-4">
        <div className="d-flex justify-content-between flex-wrap align-items-center mb-3">
          <h5 className="mb-0">
            Bids <small className="text-muted">({job.bid_count} placed)</small>
          </h5>
          <select
            className="form-control form-control-sm w-auto"
            aria-label="Bid status"
            value={bidStatus}
            onChange={(e) => {
              setBidStatus(e.target.value);
              setBidPage(1);
            }}
          >
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {bidsError ? (
          <p className="text-danger" role="alert">
            {bidsError}
          </p>
        ) : !bids ? (
          <p className="text-muted">Loading…</p>
        ) : bids.count === 0 ? (
          <p className="text-muted mb-0" data-testid="bids-empty">
            {bidStatus ? "No bids with this status." : "No bids yet. Sellers who bid will show here."}
          </p>
        ) : (
          <div data-testid="bids-list">
            {bids.results.map((bid) => (
              <BidCard key={bid.id} bid={bid} canAccept={open} busy={busy} onAccept={(b, t) => void accept(b, t)} />
            ))}
            <Pager page={bids.page} totalPages={bids.total_pages} onPage={setBidPage} />
          </div>
        )}
      </div>
    </div>
  );
}
