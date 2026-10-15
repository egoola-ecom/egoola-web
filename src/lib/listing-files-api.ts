import { authFetch } from "./auth";
import type { ListingMediaItem, ListingStatus } from "./listing-api";
import { parseFieldErrors } from "./use-managed-list";

// ---------------------------------------------------------------------------
// Files of a product or a gig: the thumbnail (cover picture) and the gallery.
// docs/listing-complete-guide.md §15. Listing and gig create / update are JSON
// only; their files have four multipart APIs, the same for a product id and a
// gig id (a job id is 404):
//
//   admin   POST / PATCH /catalog/listing-files/{id}/
//   seller  POST / PATCH /seller/listing-files/{id}/   (own listings only)
//
// POST adds (first time; a second thumbnail is 400), PATCH changes. Every part
// is independent and the request is all or nothing: on a 400 nothing was saved.
// A files change NEVER changes the listing status.
// ---------------------------------------------------------------------------

export type FilesScope = "admin" | "seller";

/** What both calls answer: the state to show again. */
export interface ListingFilesResult {
  image_path: string | null;
  image_url: string | null;
  media: ListingMediaItem[];
  status: ListingStatus;
}

export interface AddFilesInput {
  thumbnail?: File | null;
  media?: File[];
}

export interface ChangeFilesInput {
  removeThumbnail?: boolean;
  /** A new thumbnail always replaces the old one. */
  thumbnail?: File | null;
  removeMediaIds?: number[];
  media?: File[];
}

function filesPath(scope: FilesScope, id: number) {
  return scope === "admin" ? `/catalog/listing-files/${id}/` : `/seller/listing-files/${id}/`;
}

/** `authFetch` leaves Content-Type to the browser for FormData (the multipart
 * boundary is set there). */
export function addFiles(scope: FilesScope, id: number, input: AddFilesInput) {
  const formData = new FormData();
  if (input.thumbnail) formData.append("thumbnail", input.thumbnail);
  for (const file of input.media ?? []) formData.append("media_file", file);
  return authFetch<ListingFilesResult>(scope, filesPath(scope, id), {
    method: "POST",
    body: formData,
  });
}

export function changeFiles(scope: FilesScope, id: number, input: ChangeFilesInput) {
  const formData = new FormData();
  if (input.removeThumbnail) formData.append("remove_thumbnail", "true");
  if (input.thumbnail) formData.append("thumbnail", input.thumbnail);
  if (input.removeMediaIds && input.removeMediaIds.length > 0) {
    formData.append("remove_media_ids", input.removeMediaIds.join(","));
  }
  for (const file of input.media ?? []) formData.append("media_file", file);
  return authFetch<ListingFilesResult>(scope, filesPath(scope, id), {
    method: "PATCH",
    body: formData,
  });
}

// --- Limits (the server checks them too) ------------------------------------

/** Thumbnail: JPG, PNG or WEBP, up to 10 MB, a real picture. */
export const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const THUMBNAIL_ACCEPT = THUMBNAIL_TYPES.join(",");
export const THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024;

/** Gallery: JPG, PNG, WEBP, GIF, MP4 or PDF. An admin has no other limit. A
 * seller: 10 MB per file, 10 files per request, 20 per listing (files removed
 * in the same call do not count). */
export const GALLERY_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
];
export const GALLERY_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.pdf";
export const SELLER_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const SELLER_MEDIA_MAX_PER_REQUEST = 10;
export const SELLER_MEDIA_MAX_PER_LISTING = 20;

/** Returns the message to show, or null when the thumbnail is fine. */
export function checkThumbnailFile(file: File): string | null {
  if (!THUMBNAIL_TYPES.includes(file.type)) {
    return "The thumbnail must be a JPG, PNG or WEBP picture.";
  }
  if (file.size > THUMBNAIL_MAX_BYTES) return "The thumbnail can be up to 10 MB.";
  return null;
}

/** Checks picked gallery files one by one. `kept` is how many files the
 * listing keeps (already there, minus those marked for removal); `queued` is
 * how many new files are already waiting to be sent. */
export function checkGalleryPick(
  scope: FilesScope,
  picked: File[],
  kept: number,
  queued: number,
): { accepted: File[]; problems: string[] } {
  const accepted: File[] = [];
  const problems: string[] = [];
  for (const file of picked) {
    if (!GALLERY_TYPES.includes(file.type)) {
      problems.push(`${file.name}: only JPG, PNG, WEBP, GIF, MP4 or PDF files are accepted.`);
    } else if (scope === "seller" && file.size > SELLER_MEDIA_MAX_BYTES) {
      problems.push(`${file.name}: files can be up to 10 MB.`);
    } else if (scope === "seller" && queued + accepted.length >= SELLER_MEDIA_MAX_PER_REQUEST) {
      problems.push(`${file.name}: you can add up to ${SELLER_MEDIA_MAX_PER_REQUEST} files at a time.`);
    } else if (
      scope === "seller" &&
      kept + queued + accepted.length >= SELLER_MEDIA_MAX_PER_LISTING
    ) {
      problems.push(`${file.name}: a listing can have up to ${SELLER_MEDIA_MAX_PER_LISTING} files.`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, problems };
}

/** One sentence for a refused files call (400 `thumbnail`, `media_file` or
 * `remove_media_ids`), used when the listing was saved but its files were not. */
export function filesErrorReason(err: unknown): string {
  const { fieldErrors, message } = parseFieldErrors(err);
  const parts = [
    ...(fieldErrors.thumbnail ?? []),
    ...(fieldErrors.media_file ?? []),
    ...(fieldErrors.remove_media_ids ?? []),
  ];
  return parts.length > 0 ? parts.join(" ") : (message ?? "The files could not be uploaded.");
}
