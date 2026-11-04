"use client";

import { useState } from "react";
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

export function ProfilePictureField({
  fallbackName,
  initialUrl,
  onFileChange,
}: {
  fallbackName: string;
  initialUrl: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [sizeError, setSizeError] = useState<string | null>(null);

  return (
    <div className={styles.avatarUploader}>
      <div className={styles.avatarPreview}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          initials(fallbackName || "New")
        )}
      </div>
      <label className={styles.fileButton}>
        Choose photo
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = takeFile(event.target, setSizeError);
            if (file === undefined) return;
            onFileChange(file);
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
      </label>
      <p className={styles.fieldHint}>{`Image files only. ${SIZE_HINT_IMAGE}`}</p>
      {sizeError && (
        <p className={styles.fieldError} role="alert">
          {sizeError}
        </p>
      )}
    </div>
  );
}
