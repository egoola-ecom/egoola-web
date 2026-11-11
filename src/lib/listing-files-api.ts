import { authFetch } from "./auth";
import type { ListingMediaItem, ListingStatus } from "./listing-api";
import { parseFieldErrors } from "./use-managed-list";
import { ENDPOINTS } from "./endpoints";
import { fileSizeProblem } from "./file-limits";

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
  return scope === "admin"
    ? ENDPOINTS.admin.catalog.listingFiles.detail(id)
    : ENDPOINTS.seller.listingFiles.detail(id);
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

/** Thumbnail: JPG, PNG or WEBP, a real picture, within the image limit (see
 * `file-limits.ts`). */
export const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const THUMBNAIL_ACCEPT = THUMBNAIL_TYPES.join(",");

/** Gallery: JPG, PNG, WEBP, GIF, MP4 or PDF. Every file is held to the size
 * limit of its kind (see `file-limits.ts`). A seller may also add 10 files per
 * request and 20 per listing (files removed in the same call do not count). */
export const GALLERY_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
];
export const GALLERY_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.pdf";
export const SELLER_MEDIA_MAX_PER_REQUEST = 10;
export const SELLER_MEDIA_MAX_PER_LISTING = 20;
/** The server holds a seller's gallery PDFs and videos to 10 MB (images stay at
 * the 2 MB image limit), tighter than the generic 30 MB for "other" files. */
export const SELLER_GALLERY_MAX_MB = 10;

/** Returns the message to show, or null when the thumbnail is fine. */
export function checkThumbnailFile(file: File): string | null {
  if (!THUMBNAIL_TYPES.includes(file.type)) {
    return "The thumbnail must be a JPG, PNG or WEBP picture.";
  }
  return fileSizeProblem(file);
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
    } else if (fileSizeProblem(file)) {
      problems.push(fileSizeProblem(file) as string);
    } else if (scope === "seller" && file.size > SELLER_GALLERY_MAX_MB * 1024 * 1024) {
      problems.push(`${file.name} is too big. Each file must be ${SELLER_GALLERY_MAX_MB} MB or smaller.`);
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
