"use client";

import { useState } from "react";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { SellerJobCard, listMyJobs } from "@/lib/seller-job-api";
import { useCursorList } from "@/lib/use-cursor-list";
import shell from "../../../seller-shell.module.css";
import { useListingFailure } from "../../listings/listing-status";
import { JobTable } from "../job-card";
import { LoadMore } from "../load-more";

/** "My jobs": every job the seller has bid on, with a switch to only the ones
 * won (the seller's own bid is accepted or completed). */
export function MyJobsClient({ initialWon }: { initialWon: boolean }) {
  const fail = useListingFailure();
  const [won, setWon] = useState(initialWon);

  const { items, loading, loadingMore, error, hasMore, loadMore } = useCursorList<SellerJobCard>(
    listMyJobs,
    "",
    { won: won ? "true" : "" },
    20,
    fail,
  );

  return (
    <div>
      <div className={management.pageHeading}>
        <div>
          <h1 className={shell.pageTitle}>My jobs</h1>
          <p className={shell.pageText} style={{ marginBottom: 0 }}>
            Jobs you have bid on. Switch to Won to see only the ones a buyer hired you for.
          </p>
        </div>
      </div>

      <div className={management.toolbar}>
        <div className={management.toolbarLeft} role="group" aria-label="Which jobs">
          <button
            type="button"
            className={won ? management.actionButton : management.addButton}
            aria-pressed={!won}
            onClick={() => setWon(false)}
          >
            All I bid on
          </button>
          <button
            type="button"
            className={won ? management.addButton : management.actionButton}
            aria-pressed={won}
            onClick={() => setWon(true)}
          >
            Won
          </button>
        </div>
      </div>

      {error && <p className={management.errorBanner}>{error}</p>}

      <JobTable
        jobs={items}
        loading={loading}
        showStatus
        emptyText={won ? "You have not won a job yet." : "You have not bid on any job yet."}
      />
      <LoadMore shown={items.length} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
    </div>
  );
}
