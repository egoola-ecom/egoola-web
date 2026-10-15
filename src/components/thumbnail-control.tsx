import { resolveMediaUrl } from "@/lib/env";
import styles from "./thumbnail-control.module.css";

/** A thumbnail in a list row: the picture, or a placeholder when there is none. */
export function RowThumbnail({ url, alt = "" }: { url: string | null; alt?: string }) {
  const src = resolveMediaUrl(url);
  if (!src) return <span className={styles.rowThumbEmpty}>No picture</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={styles.rowThumb} />;
}
