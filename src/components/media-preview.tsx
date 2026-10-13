import management from "@/app/(admin)/admin/(protected)/management.module.css";
import type { ListingMediaType } from "@/lib/listing-api";

/**
 * One gallery file as a tile preview: an image inline, a video with a player,
 * a document as a link. The server detects the type (`media_type`); `url` is
 * the already-resolved file URL (`resolveMediaUrl`).
 */
export function MediaPreview({
  type,
  url,
}: {
  type: ListingMediaType | string;
  url: string | null;
}) {
  if (type === "image" && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={management.mediaTilePreview} />;
  }
  if (type === "video" && url) {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className={management.mediaTilePreview}
        style={{ background: "#000" }}
      />
    );
  }
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className={management.mediaTilePreview}>
      Document
    </a>
  ) : (
    <span className={management.mediaTilePreview}>{type}</span>
  );
}
