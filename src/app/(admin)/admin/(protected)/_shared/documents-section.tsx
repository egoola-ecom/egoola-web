"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/env";
import { MediaItem } from "@/lib/profile-fields";
import styles from "../management.module.css";

export interface NewDocumentRow<TFor extends string> {
  key: number;
  mediaFor: TFor;
  file: File | null;
}

export function DocumentsSection<TFor extends string>({
  idPrefix,
  existingMedia,
  mediaForOptions,
  removedMediaIds,
  onToggleRemove,
  newDocuments,
  onChangeNewDocuments,
}: {
  idPrefix: string;
  existingMedia: MediaItem<TFor>[];
  mediaForOptions: { value: TFor; label: string }[];
  removedMediaIds: number[];
  onToggleRemove: (id: number) => void;
  newDocuments: NewDocumentRow<TFor>[];
  onChangeNewDocuments: (rows: NewDocumentRow<TFor>[]) => void;
}) {
  const [nextKey, setNextKey] = useState(0);

  return (
    <>
      {existingMedia.length > 0 && (
        <>
          <p className={styles.sectionDivider}>Documents on file</p>
          <div className={styles.mediaList}>
            {existingMedia.map((media) => {
              const marked = removedMediaIds.includes(media.id);
              const mediaUrl = resolveMediaUrl(media.media_url);
              return (
                <div
                  key={media.id}
                  className={`${styles.mediaRow} ${marked ? styles.mediaRowRemoving : ""}`}
                >
                  {media.media_type === "image" && mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className={styles.mediaThumb} />
                  )}
                  <span className={styles.mediaLabel}>
                    {media.media_for.replace(/_/g, " ")}
                  </span>
                  <a
                    href={mediaUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.mediaLink}
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className={styles.mediaRemoveToggle}
                    onClick={() => onToggleRemove(media.id)}
                  >
                    {marked ? "Undo" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className={styles.sectionDivider}>Add documents</p>
      <div className={styles.repeatGroup}>
        {newDocuments.map((doc) => (
          <div key={doc.key} className={styles.repeatRow}>
            <button
              type="button"
              className={styles.repeatRowRemove}
              onClick={() =>
                onChangeNewDocuments(newDocuments.filter((d) => d.key !== doc.key))
              }
            >
              Remove
            </button>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-doc-type-${doc.key}`}>
                Type
              </label>
              <select
                id={`${idPrefix}-doc-type-${doc.key}`}
                className={styles.select}
                value={doc.mediaFor}
                onChange={(event) =>
                  onChangeNewDocuments(
                    newDocuments.map((d) =>
                      d.key === doc.key ? { ...d, mediaFor: event.target.value as TFor } : d,
                    ),
                  )
                }
              >
                {mediaForOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-doc-file-${doc.key}`}>
                File
              </label>
              <input
                id={`${idPrefix}-doc-file-${doc.key}`}
                type="file"
                className={styles.input}
                onChange={(event) =>
                  onChangeNewDocuments(
                    newDocuments.map((d) =>
                      d.key === doc.key
                        ? { ...d, file: event.target.files?.[0] ?? null }
                        : d,
                    ),
                  )
                }
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addRowButton}
          onClick={() => {
            onChangeNewDocuments([
              ...newDocuments,
              { key: nextKey, mediaFor: mediaForOptions[0].value, file: null },
            ]);
            setNextKey(nextKey + 1);
          }}
        >
          + Add document
        </button>
      </div>
    </>
  );
}
