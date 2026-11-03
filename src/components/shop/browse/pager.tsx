/** Numbered pages for a page-based list: Previous, a window of numbers, Next. */
export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const last = Math.min(totalPages, first + 4);
  const numbers: number[] = [];
  for (let n = first; n <= last; n += 1) numbers.push(n);
  return (
    <nav aria-label="Pages" className="d-flex justify-content-center my-4">
      <ul className="pagination mb-0">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <button type="button" className="page-link" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </button>
        </li>
        {numbers.map((n) => (
          <li key={n} className={`page-item ${n === page ? "active" : ""}`}>
            <button type="button" className="page-link" aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>
              {n}
            </button>
          </li>
        ))}
        <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
          <button type="button" className="page-link" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
