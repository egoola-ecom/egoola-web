"use client";

import { SellerDetail } from "@/lib/accounts-api";
import { resolveMediaUrl } from "@/lib/env";
import styles from "../management.module.css";

const MEDIA_LABELS: Record<string, string> = {
  nid: "NID",
  birth_certificate: "Birth certificate",
  certificate: "Certificate",
  other: "Other",
};

/** The seller's uploaded documents, for a reviewer: images are shown inline
 * (click to open full size) and PDFs open in a new tab. `media_url` is a path
 * on a local server and a full signed link in production — both are handled
 * by `resolveMediaUrl`. A signed link expires, so reload the page if one
 * stops opening. */
export function SellerDocuments({ seller }: { seller: SellerDetail }) {
  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Documents</h2>
      {seller.media.length === 0 ? (
        <p className={styles.stateRow}>No documents were uploaded.</p>
      ) : (
        <div className={styles.docGrid}>
          {seller.media.map((media) => {
            const url = resolveMediaUrl(media.media_url);
            const label = MEDIA_LABELS[media.media_for] ?? media.media_for.replace(/_/g, " ");
            return (
              <div key={media.id} className={styles.docCard}>
                <a
                  className={styles.docPreview}
                  href={url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${label} in a new tab`}
                >
                  {media.media_type === "image" && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={label} />
                  ) : (
                    "PDF"
                  )}
                </a>
                <div className={styles.docFoot}>
                  <span className={styles.docLabel}>{label}</span>
                  <a
                    href={url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.mediaLink}
                  >
                    Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
