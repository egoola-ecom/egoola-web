"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jobProblem, listJobs, type JobRow } from "@/lib/buyer/buyer-jobs-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { isInvalidPage } from "@/lib/buyer/public-fetch";
import type { PageResult } from "@/lib/buyer/types";
import { Pager } from "../browse/pager";
import { useQueryParams } from "../browse/use-query-params";
import { PRICE_UNIT, taka } from "../money";
import { SHOP } from "../shop-links";
import { JOB_STATUS, JobStatusBadge, dateText } from "./job-status";

const PAGE_SIZE = 10;

export function JobsScreen() {
  const router = useRouter();
  const { get, update } = useQueryParams();
  const status = get("status");
  const search = get("search");
  const page = Math.max(1, Number(get("page")) || 1);

  const [data, setData] = useState<PageResult<JobRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastEnd, setPastEnd] = useState(false);
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    setPastEnd(false);
    listJobs({ status, search, page, page_size: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname + window.location.search));
        else if (isInvalidPage(err)) setPastEnd(true);
        else setError(jobProblem(err).general);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

  const filtered = Boolean(status || search);

  return (
    <div className="container-fluid p-587 my-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">My jobs</h4>
        <Link className="btn btn-success" href={SHOP.newJob} data-testid="post-job">
          Post a job
        </Link>
      </div>

      <form
        className="form-inline mb-3"
        onSubmit={(event) => {
          event.preventDefault();
          update({ search: draft.trim() || undefined });
        }}
      >
        <input
          className="form-control form-control-sm mr-2 mb-2"
          type="search"
          aria-label="Search jobs"
          placeholder="Search title or description"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <select
          className="form-control form-control-sm mr-2 mb-2"
          aria-label="Status"
          value={status}
          onChange={(e) => update({ status: e.target.value || undefined })}
        >
          <option value="">Any status</option>
          {Object.entries(JOB_STATUS).map(([value, s]) => (
            <option key={value} value={value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-success btn-sm mr-2 mb-2">
          Search
        </button>
        {filtered && (
          <button
            type="button"
            className="btn btn-light btn-sm border mb-2"
            onClick={() => {
              setDraft("");
              update({ status: undefined, search: undefined });
            }}
          >
            Clear
          </button>
        )}
      </form>

      {error ? (
        <p className="text-danger text-center py-5" role="alert">
          {error}
        </p>
      ) : pastEnd ? (
        <div className="text-center py-5" data-testid="past-end">
          <p className="text-muted">There are no more jobs to show.</p>
          <button type="button" className="btn btn-success btn-sm" onClick={() => update({ page: undefined })}>
            Back to the first page
          </button>
        </div>
      ) : !data ? (
        <p className="text-muted text-center py-5">Loading…</p>
      ) : data.count === 0 ? (
        <div className="bg-white text-center p-5" data-testid="jobs-empty">
          {filtered ? (
            <p className="mb-0">No jobs match this search.</p>
          ) : (
            <>
              <h5>You haven&apos;t posted a job yet</h5>
              <p className="text-muted">Describe the work and your budget, and sellers will bid.</p>
              <Link className="btn btn-success" href={SHOP.newJob}>
                Post your first job
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-muted small">
            {data.count} {data.count === 1 ? "job" : "jobs"}
          </p>
          <div data-testid="jobs-list">
            {data.results.map((job) => (
              <Link
                key={job.id}
                href={SHOP.job(job.id)}
                className="d-block bg-white border rounded p-3 mb-2 text-dark text-decoration-none"
                data-testid="job-row"
              >
                <div className="d-flex justify-content-between flex-wrap">
                  <strong>{job.title}</strong>
                  <JobStatusBadge status={job.status} />
                </div>
                <div className="small text-muted mt-1">
                  {job.category.name} · posted {dateText(job.created_at)}
                  {job.urgent && <span className="badge badge-warning ml-2">Urgent</span>}
                </div>
                <div className="mt-2 small">
                  Budget:{" "}
                  {job.budget
                    ? `${taka(job.budget.price)}${job.budget.price_type === "fixed" ? "" : ` / ${PRICE_UNIT[job.budget.price_type]}`}`
                    : "none set"}
                  {" · "}
                  <span data-testid="bid-count">{job.bid_count}</span> {job.bid_count === 1 ? "bid" : "bids"}
                </div>
              </Link>
            ))}
          </div>
          <Pager page={data.page} totalPages={data.total_pages} onPage={(n) => update({ page: String(n) })} />
        </>
      )}
    </div>
  );
}
