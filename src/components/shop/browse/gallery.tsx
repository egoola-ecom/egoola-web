"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/buyer/types";
import { resolveMediaUrl } from "@/lib/env";

/** The main photo with a strip of the others. The thumbnail is first, then the
 * gallery images; videos and documents are not shown here. */
export function Gallery({ thumbnail, media, title }: { thumbnail: string | null; media: MediaItem[]; title: string }) {
  const urls: string[] = [];
  const add = (url: string | null) => {
    const full = resolveMediaUrl(url);
    if (full && !urls.includes(full)) urls.push(full);
  };
  add(thumbnail);
  for (const item of media) if (item.media_type === "image") add(item.media_url);
  const [active, setActive] = useState(0);
  const shown = urls[Math.min(active, Math.max(urls.length - 1, 0))] ?? "/shop/images/no-img.jpg";

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shown} alt={title} className="w-100 border" style={{ maxHeight: 420, objectFit: "contain", background: "#fff" }} />
      {urls.length > 1 && (
        <div className="d-flex flex-wrap mt-2">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              className="p-0 mr-2 mb-2 bg-white"
              style={{ border: i === active ? "2px solid #2cd083" : "1px solid #ddd" }}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" width={64} height={64} style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
