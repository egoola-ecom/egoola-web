import type { JobStatus } from "@/lib/buyer/buyer-jobs-api";

export const JOB_STATUS: Record<string, { label: string; badge: string }> = {
  open_for_bidding: { label: "Open for bids", badge: "badge-success" },
  draft: { label: "Paused", badge: "badge-secondary" },
  pending: { label: "Reopening", badge: "badge-warning" },
  in_progress: { label: "In progress", badge: "badge-primary" },
  completed: { label: "Completed", badge: "badge-dark" },
  cancelled: { label: "Cancelled", badge: "badge-danger" },
};

export const BID_STATUS: Record<string, string> = {
  pending: "badge-warning",
  accepted: "badge-success",
  rejected: "badge-secondary",
  cancelled: "badge-danger",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const known = JOB_STATUS[status];
  return (
    <span className={`badge ${known?.badge ?? "badge-light"} p-2`} data-testid="job-status">
      {known?.label ?? status}
    </span>
  );
}

export function dateText(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
