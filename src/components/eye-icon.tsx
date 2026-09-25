export function EyeIcon({ off = false }: { off?: boolean }) {
  if (off) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a17.4 17.4 0 0 1-3.1 4.24M6.6 6.6C3.9 8.36 2 12 2 12s3 8 10 8a9.3 9.3 0 0 0 5.4-1.6" />
        <path d="M9.5 9.5a3 3 0 0 0 4.24 4.24" />
        <path d="M2 2l20 20" />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
