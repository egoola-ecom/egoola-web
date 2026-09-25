export type CategoryIconName =
  | "electronics"
  | "fashion"
  | "home"
  | "freelance"
  | "digital"
  | "grocery";

const PATHS: Record<CategoryIconName, React.ReactNode> = {
  electronics: (
    <>
      <rect x="4" y="3" width="16" height="12" rx="1.5" />
      <path d="M9 20h6M12 15v5" />
    </>
  ),
  fashion: (
    <path d="M8 4l4 3 4-3 3 3-3 3v11H8V10L5 7l3-3Z" />
  ),
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  freelance: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  digital: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  grocery: (
    <>
      <path d="M4 6h2l1.5 10.5A2 2 0 0 0 9.5 18h7a2 2 0 0 0 2-1.7L20 8H6.2" />
      <circle cx="10" cy="21" r="1" />
      <circle cx="17" cy="21" r="1" />
    </>
  ),
};

export function CategoryIcon({ name }: { name: CategoryIconName }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
