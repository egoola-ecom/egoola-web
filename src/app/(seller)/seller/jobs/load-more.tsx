import management from "@/app/(admin)/admin/(protected)/management.module.css";

/** The footer of a cursor-paged list: there is no page count, only "more". */
export function LoadMore({
  shown,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  shown: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (!hasMore) return null;
  return (
    <div className={management.pagination}>
      <span className={management.pageInfo}>{shown} shown</span>
      <div className={management.pageButtons}>
        <button
          type="button"
          className={management.pageButton}
          onClick={onLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      </div>
    </div>
  );
}
