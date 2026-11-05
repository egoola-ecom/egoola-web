"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/env";
import { SIZE_HINT_IMAGE, takeFile } from "@/lib/file-limits";
import styles from "../management.module.css";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** A profile picture: choose or replace one, and (when the record already has
 * one and the form passes `onRemoveChange`) remove it. Removing is only marked
 * here: the picture is cleared when the form is saved, and "Undo" takes the
 * mark back. Choosing a new file while it is marked keeps the new file. */
export function ProfilePictureField({
  fallbackName,
  initialUrl,
  onFileChange,
  onRemoveChange,
}: {
  fallbackName: string;
  initialUrl: string | null;
  onFileChange: (file: File | null) => void;
  /** Leave out on a create form, where there is nothing to remove. */
  onRemoveChange?: (removed: boolean) => void;
}) {
  const savedUrl = resolveMediaUrl(initialUrl);
  const [preview, setPreview] = useState<string | null>(savedUrl);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [chosen, setChosen] = useState(false);

  function markRemoved(next: boolean) {
    setRemoved(next);
    onRemoveChange?.(next);
    if (next) {
      onFileChange(null);
      setChosen(false);
      setPreview(null);
    } else {
      setPreview(savedUrl);
    }
  }

  return (
    <div className={styles.avatarUploader}>
      <div className={styles.avatarPreview} data-testid="picture-preview">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          initials(fallbackName || "New")
        )}
      </div>
      <label className={styles.fileButton}>
        {initialUrl && !removed ? "Replace photo" : "Choose photo"}
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          data-testid="picture-input"
          onChange={(event) => {
            const file = takeFile(event.target, setSizeError);
            if (file === undefined) return;
            onFileChange(file);
            setChosen(Boolean(file));
            if (file) {
              setPreview(URL.createObjectURL(file));
              if (removed) {
                setRemoved(false);
                onRemoveChange?.(false);
              }
            }
          }}
        />
      </label>
      {onRemoveChange && initialUrl && !removed && (
        <button type="button" className={styles.actionButton} data-testid="picture-remove" onClick={() => markRemoved(true)}>
          Remove photo
        </button>
      )}
      {onRemoveChange && removed && (
        <button type="button" className={styles.actionButton} data-testid="picture-undo" onClick={() => markRemoved(false)}>
          Undo remove
        </button>
      )}
      <p className={styles.fieldHint}>{`Image files only. ${SIZE_HINT_IMAGE}`}</p>
      {removed && (
        <p className={styles.fieldHint} data-testid="picture-removed-note">
          The photo is removed when you save.
        </p>
      )}
      {chosen && !removed && initialUrl && (
        <p className={styles.fieldHint}>The new photo replaces the current one when you save.</p>
      )}
      {sizeError && (
        <p className={styles.fieldError} role="alert">
          {sizeError}
        </p>
      )}
    </div>
  );
}
