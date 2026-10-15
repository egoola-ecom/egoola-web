"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import {
  FilesScope,
  GALLERY_ACCEPT,
  ListingFilesResult,
  SELLER_MEDIA_MAX_PER_LISTING,
  SELLER_MEDIA_MAX_PER_REQUEST,
  THUMBNAIL_ACCEPT,
  changeFiles,
  checkGalleryPick,
  checkThumbnailFile,
} from "@/lib/listing-files-api";
import type { ListingMediaItem } from "@/lib/listing-api";
import { describeError, parseFieldErrors } from "@/lib/use-managed-list";
import { MediaPreview } from "./media-preview";
import styles from "./thumbnail-control.module.css";
import filesStyles from "./listing-files-control.module.css";

/** What a create form holds until the listing exists. The parent sends it
 * with `addFiles` right after the first save. */
export interface StagedFiles {
  thumbnail: File | null;
  media: File[];
}

export const EMPTY_STAGED_FILES: StagedFiles = { thumbnail: null, media: [] };

type Common = {
  scope: FilesScope;
  loginPath: string;
  disabled?: boolean;
  /** Overrides how a failed call is turned into a message (return null when
   * the failure was handled, e.g. a redirect to login). */
  onFailure?: (err: unknown) => string | null;
};

type Props = Common &
  (
    | {
        /** Edit and details pages: the listing exists, "Save files" sends one
         * PATCH with everything that changed. */
        mode: "live";
        listingId: number;
        imageUrl: string | null;
        media: ListingMediaItem[];
        /** Told with the server's answer so the page can show it again. */
        onSaved: (result: ListingFilesResult) => void;
      }
    | {
        /** Create forms: nothing is sent here. */
        mode: "staged";
        value: StagedFiles;
        onChange: (value: StagedFiles) => void;
      }
  );

interface LivePending {
  thumbnail: File | null;
  removeThumbnail: boolean;
  removeIds: number[];
  media: File[];
}

const NO_PENDING: LivePending = { thumbnail: null, removeThumbnail: false, removeIds: [], media: [] };

/** One control for the cover picture and the gallery of a product or a gig,
 * used by the admin and the seller screens. */
export function ListingFilesControl(props: Props) {
  const { scope, loginPath, disabled = false, onFailure } = props;
  const router = useRouter();
  const thumbInput = useRef<HTMLInputElement>(null);
  const [livePending, setLivePending] = useState<LivePending>(NO_PENDING);
  const [busy, setBusy] = useState(false);
  const [thumbError, setThumbError] = useState<string[]>([]);
  const [galleryError, setGalleryError] = useState<string[]>([]);
  const [removeError, setRemoveError] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  const staged = props.mode === "staged";
  const pending: LivePending = staged
    ? { thumbnail: props.value.thumbnail, removeThumbnail: false, removeIds: [], media: props.value.media }
    : livePending;
  const existingMedia = staged ? [] : props.media;
  const currentThumb = staged ? null : props.imageUrl;

  function update(next: Partial<LivePending>) {
    if (props.mode === "staged") {
      props.onChange({
        thumbnail: next.thumbnail !== undefined ? next.thumbnail : props.value.thumbnail,
        media: next.media !== undefined ? next.media : props.value.media,
      });
    } else {
      setLivePending((prev) => ({ ...prev, ...next }));
    }
  }

  const stagedThumb = pending.thumbnail;
  useEffect(() => {
    if (!stagedThumb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(stagedThumb);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedThumb]);

  function clearMessages() {
    setThumbError([]);
    setGalleryError([]);
    setRemoveError([]);
    setGeneralError(null);
    setSaved(null);
  }

  const shownThumb = localUrl ?? (pending.removeThumbnail ? null : resolveMediaUrl(currentThumb));
  const hasPicture = shownThumb != null;
  const keptMedia = existingMedia.filter((m) => !pending.removeIds.includes(m.id)).length;
  const hasChanges =
    pending.thumbnail != null ||
    pending.removeThumbnail ||
    pending.removeIds.length > 0 ||
    pending.media.length > 0;
  const locked = disabled || busy;

  function chooseThumbnail(file: File | undefined) {
    if (!file) return;
    clearMessages();
    const problem = checkThumbnailFile(file);
    if (problem) {
      setThumbError([problem]);
      return;
    }
    // A new thumbnail always replaces the old one, so no remove is needed.
    update({ thumbnail: file, removeThumbnail: false });
  }

  function removeThumbnail() {
    clearMessages();
    if (pending.thumbnail) {
      update({ thumbnail: null });
      return;
    }
    if (!staged) update({ removeThumbnail: true });
  }

  function pickGallery(picked: File[]) {
    clearMessages();
    const { accepted, problems } = checkGalleryPick(scope, picked, keptMedia, pending.media.length);
    if (accepted.length > 0) update({ media: [...pending.media, ...accepted] });
    if (problems.length > 0) setGalleryError(problems);
  }

  function toggleRemoved(id: number) {
    clearMessages();
    const removing = pending.removeIds.includes(id);
    update({
      removeIds: removing ? pending.removeIds.filter((x) => x !== id) : [...pending.removeIds, id],
    });
  }

  function failureMessage(err: unknown): string | null {
    if (!(err instanceof ApiError && err.status === 400)) {
      if (onFailure) return onFailure(err);
      if (err instanceof AuthError) {
        clearSession(scope);
        router.replace(loginPath);
        return null;
      }
    }
    if (err instanceof ApiError && err.status === 400) {
      // {"thumbnail": [...]}, {"media_file": [...]}, {"remove_media_ids": [...]}.
      const { fieldErrors, message } = parseFieldErrors(err);
      setThumbError(fieldErrors.thumbnail ?? []);
      setGalleryError(fieldErrors.media_file ?? []);
      setRemoveError(fieldErrors.remove_media_ids ?? []);
      const mapped = ["thumbnail", "media_file", "remove_media_ids"].some((k) => fieldErrors[k]);
      return mapped ? null : (message ?? "The files were not accepted. Nothing was saved.");
    }
    return describeError(err);
  }

  async function save() {
    if (props.mode !== "live" || !hasChanges) return;
    const removing = pending.removeThumbnail || pending.removeIds.length > 0;
    if (removing && !window.confirm("Removed files are deleted for good. Save the changes?")) return;
    clearMessages();
    setBusy(true);
    try {
      const result = await changeFiles(scope, props.listingId, {
        removeThumbnail: pending.removeThumbnail && !pending.thumbnail,
        thumbnail: pending.thumbnail,
        removeMediaIds: pending.removeIds,
        media: pending.media,
      });
      setLivePending(NO_PENDING);
      props.onSaved(result);
      setSaved("Files saved.");
    } catch (err) {
      setGeneralError(failureMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    clearMessages();
    setLivePending(NO_PENDING);
  }

  const summary = [
    pending.thumbnail ? "new thumbnail" : null,
    pending.removeThumbnail ? "thumbnail removed" : null,
    pending.removeIds.length > 0 ? `${pending.removeIds.length} to remove` : null,
    pending.media.length > 0 ? `${pending.media.length} to add` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <span className={management.label}>Thumbnail</span>
      <div className={styles.root}>
        <div className={styles.preview}>
          {shownThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownThumb} alt="Thumbnail preview" />
          ) : (
            "No thumbnail"
          )}
        </div>
        <div className={styles.side}>
          <div className={styles.buttons}>
            <input
              ref={thumbInput}
              type="file"
              className={styles.hiddenInput}
              accept={THUMBNAIL_ACCEPT}
              aria-label="Choose thumbnail picture"
              onChange={(event) => {
                chooseThumbnail(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className={management.actionButton}
              disabled={locked}
              onClick={() => thumbInput.current?.click()}
            >
              {hasPicture ? "Replace" : "Choose picture"}
            </button>
            {hasPicture && (
              <button
                type="button"
                className={`${management.actionButton} ${management.actionButtonDanger}`}
                disabled={locked}
                onClick={removeThumbnail}
              >
                Remove
              </button>
            )}
            {pending.removeThumbnail && (
              <button
                type="button"
                className={management.actionButton}
                disabled={locked}
                onClick={() => update({ removeThumbnail: false })}
              >
                Undo remove
              </button>
            )}
          </div>
          <p className={management.fieldHint}>JPG, PNG or WEBP, up to 10 MB.</p>
          {thumbError.map((message, i) => (
            <p key={i} className={management.fieldError}>
              {message}
            </p>
          ))}
        </div>
      </div>

      <span className={management.label} style={{ display: "block", marginTop: "1rem" }}>
        Gallery
      </span>
      {existingMedia.length > 0 && (
        <div className={management.mediaGrid} style={{ marginTop: "0.4rem" }}>
          {existingMedia.map((media) => {
            const url = resolveMediaUrl(media.media_url);
            const removing = pending.removeIds.includes(media.id);
            return (
              <div
                key={media.id}
                className={`${management.mediaTile} ${removing ? management.mediaTileRemoving : ""}`}
              >
                <MediaPreview type={media.media_type} url={url} />
                <button
                  type="button"
                  className={management.mediaRemoveToggle}
                  style={{ marginLeft: 0, alignSelf: "flex-start" }}
                  disabled={locked}
                  onClick={() => toggleRemoved(media.id)}
                >
                  {removing ? "Undo remove" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {existingMedia.length === 0 && !staged && (
        <p className={management.fieldHint}>No gallery files yet.</p>
      )}
      <div style={{ marginTop: "0.6rem" }}>
        <label className={management.fileButton} style={{ alignSelf: "flex-start" }}>
          Add images / files
          <input
            type="file"
            multiple
            accept={GALLERY_ACCEPT}
            aria-label="Add gallery files"
            style={{ display: "none" }}
            disabled={locked}
            onChange={(event) => {
              pickGallery(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
        {pending.media.length > 0 && (
          <div className={management.mediaList} style={{ marginTop: "0.6rem" }}>
            {pending.media.map((file, index) => (
              <div key={`${file.name}-${index}`} className={management.mediaRow}>
                <span className={management.mediaLabel} style={{ textTransform: "none" }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className={management.mediaRemoveToggle}
                  disabled={locked}
                  onClick={() => update({ media: pending.media.filter((_, i) => i !== index) })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className={management.fieldHint}>
          JPG, PNG, WEBP, GIF, MP4 or PDF.
          {scope === "seller" &&
            ` Up to 10 MB each, ${SELLER_MEDIA_MAX_PER_REQUEST} at a time and ${SELLER_MEDIA_MAX_PER_LISTING} per listing.`}
        </p>
        {galleryError.map((message, i) => (
          <p key={i} className={management.fieldError}>
            {message}
          </p>
        ))}
        {removeError.map((message, i) => (
          <p key={i} className={management.fieldError}>
            {message}
          </p>
        ))}
      </div>

      {staged ? (
        <p className={management.fieldHint}>The files are uploaded right after the first save.</p>
      ) : (
        <div className={filesStyles.footer}>
          <span className={management.fieldHint}>
            {hasChanges ? `Not saved yet: ${summary}.` : "Files are saved separately from the form."}
          </span>
          <div className={styles.buttons}>
            {hasChanges && (
              <button
                type="button"
                className={management.actionButton}
                disabled={locked}
                onClick={discard}
              >
                Discard
              </button>
            )}
            <button
              type="button"
              className={management.actionButton}
              disabled={locked || !hasChanges}
              onClick={save}
            >
              {busy ? "Saving…" : "Save files"}
            </button>
          </div>
        </div>
      )}
      {generalError && <p className={management.fieldError}>{generalError}</p>}
      {saved && (
        <p className={management.fieldHint} role="status">
          {saved}
        </p>
      )}
    </div>
  );
}
