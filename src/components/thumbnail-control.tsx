"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import { ApiError } from "@/lib/api";
import { ActorType, AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { describeError, parseFieldErrors } from "@/lib/use-managed-list";
import styles from "./thumbnail-control.module.css";

/** What the server accepts as a thumbnail: JPG, PNG or WEBP, up to 10 MB. */
export const THUMBNAIL_ACCEPT = "image/jpeg,image/png,image/webp";
export const THUMBNAIL_MAX_BYTES = 10 * 1024 * 1024;

/** The same checks the server makes, so a wrong file is refused before it is
 * sent. Returns the message to show, or null when the file is fine. */
export function checkThumbnailFile(file: File): string | null {
  if (!THUMBNAIL_ACCEPT.split(",").includes(file.type)) {
    return "The thumbnail must be a JPG, PNG or WEBP picture.";
  }
  if (file.size > THUMBNAIL_MAX_BYTES) return "The thumbnail can be up to 10 MB.";
  return null;
}

/** A thumbnail in a list row: the picture, or a placeholder when there is none. */
export function RowThumbnail({ url, alt = "" }: { url: string | null; alt?: string }) {
  const src = resolveMediaUrl(url);
  if (!src) return <span className={styles.rowThumbEmpty}>No picture</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={styles.rowThumb} />;
}

type Props = {
  /** The saved thumbnail (`image_url`), or null. */
  imageUrl: string | null;
  actorType: ActorType;
  loginPath: string;
  /** Overrides how a failed call is turned into a message (return null when
   * the failure was handled, e.g. a redirect to login). */
  onFailure?: (err: unknown) => string | null;
  disabled?: boolean;
  label?: string;
} & (
  | {
      /** Edit and details pages: a chosen file is uploaded at once. */
      mode: "live";
      onUpload: (file: File) => Promise<{ image_url: string }>;
      onRemove: () => Promise<void>;
      /** Told after every upload / removal so the page can update its state. */
      onChanged?: (imageUrl: string | null) => void;
    }
  | {
      /** Create forms: the listing does not exist yet, so the picked file is
       * only held here and uploaded by the parent after the first save. */
      mode: "staged";
      file: File | null;
      onFileChange: (file: File | null) => void;
    }
);

/**
 * The cover picture of a product or gig (separate from the gallery): a
 * preview, Choose picture, Replace and Remove (with a confirmation). One
 * component for the admin and the seller screens.
 */
export function ThumbnailControl(props: Props) {
  const { imageUrl, actorType, loginPath, onFailure, disabled = false, label } = props;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<string | null>(imageUrl);
  const [lastProp, setLastProp] = useState<string | null>(imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  // A page that reloads the listing hands the new URL down: follow it.
  if (imageUrl !== lastProp) {
    setLastProp(imageUrl);
    setCurrent(imageUrl);
  }

  const stagedFile = props.mode === "staged" ? props.file : null;
  useEffect(() => {
    if (!stagedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(stagedFile);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedFile]);

  function failureMessage(err: unknown): string | null {
    if (onFailure) return onFailure(err);
    if (err instanceof AuthError) {
      clearSession(actorType);
      router.replace(loginPath);
      return null;
    }
    // 400 {"image": ["..."]}: wrong type, too big, not a real picture.
    if (err instanceof ApiError && err.status === 400) {
      const { fieldErrors, message } = parseFieldErrors(err);
      return fieldErrors.image?.[0] ?? message ?? "The picture was not accepted.";
    }
    return describeError(err);
  }

  async function handleChosen(file: File | undefined) {
    if (!file) return;
    setError(null);
    const problem = checkThumbnailFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    if (props.mode === "staged") {
      props.onFileChange(file);
      return;
    }
    setBusy(true);
    try {
      const result = await props.onUpload(file);
      setCurrent(result.image_url);
      props.onChanged?.(result.image_url);
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (props.mode === "staged") {
      props.onFileChange(null);
      setError(null);
      return;
    }
    if (!window.confirm("Remove the thumbnail? The picture is deleted for good.")) return;
    setError(null);
    setBusy(true);
    try {
      await props.onRemove();
      setCurrent(null);
      props.onChanged?.(null);
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = localUrl ?? resolveMediaUrl(current);
  const hasPicture = shown != null;
  const locked = disabled || busy;

  return (
    <div>
      {label && <span className={management.label}>{label}</span>}
      <div className={styles.root}>
        <div className={styles.preview}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Thumbnail preview" />
          ) : (
            "No thumbnail"
          )}
        </div>
        <div className={styles.side}>
          <div className={styles.buttons}>
            <input
              ref={inputRef}
              type="file"
              className={styles.hiddenInput}
              accept={THUMBNAIL_ACCEPT}
              aria-label="Choose thumbnail picture"
              onChange={(event) => {
                void handleChosen(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className={management.actionButton}
              disabled={locked}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading…" : hasPicture ? "Replace" : "Choose picture"}
            </button>
            {hasPicture && (
              <button
                type="button"
                className={`${management.actionButton} ${management.actionButtonDanger}`}
                disabled={locked}
                onClick={handleRemove}
              >
                Remove
              </button>
            )}
          </div>
          <p className={management.fieldHint}>
            JPG, PNG or WEBP, up to 10 MB.{" "}
            {props.mode === "staged"
              ? "It is uploaded right after the first save."
              : "It is saved as soon as you choose it."}
          </p>
          {error && <p className={management.fieldError}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
