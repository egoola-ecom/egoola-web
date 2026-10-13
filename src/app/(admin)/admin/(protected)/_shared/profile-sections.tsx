"use client";

import { EducationEntry, ExperienceEntry, MediaItem } from "@/lib/profile-fields";
import { resolveMediaUrl } from "@/lib/env";
import { ReadonlyField } from "./readonly-field";
import styles from "../management.module.css";

/** Read-only work-experience block for a details page; renders nothing when
 * the list is empty. */
export function ExperienceView({ entries }: { entries: ExperienceEntry[] | null }) {
  if (!entries || entries.length === 0) return null;
  return (
    <>
      <p className={styles.sectionDivider}>Work experience</p>
      <div className={styles.repeatGroup}>
        {entries.map((exp, index) => (
          <div key={index} className={styles.repeatRow}>
            <ReadonlyField label="Title" value={exp.title} />
            <ReadonlyField label="Company" value={exp.company} />
            <ReadonlyField label="From" value={exp.from} />
            <ReadonlyField label="To" value={exp.to} />
            {exp.description && (
              <div className={styles.formGridFull}>
                <ReadonlyField label="Description" value={exp.description} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function EducationView({ entries }: { entries: EducationEntry[] | null }) {
  if (!entries || entries.length === 0) return null;
  return (
    <>
      <p className={styles.sectionDivider}>Education</p>
      <div className={styles.repeatGroup}>
        {entries.map((edu, index) => (
          <div key={index} className={styles.repeatRow}>
            <ReadonlyField label="Degree" value={edu.degree} />
            <ReadonlyField label="Institution" value={edu.institution} />
            <ReadonlyField label="Year" value={edu.year} />
          </div>
        ))}
      </div>
    </>
  );
}

export function DocumentsView({ media }: { media: MediaItem<string>[] }) {
  if (media.length === 0) return null;
  return (
    <>
      <p className={styles.sectionDivider}>Documents</p>
      <div className={styles.mediaList}>
        {media.map((item) => {
          const url = resolveMediaUrl(item.media_url);
          return (
            <div key={item.id} className={styles.mediaRow}>
              {item.media_type === "image" && url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className={styles.mediaThumb} />
              )}
              <span className={styles.mediaLabel}>{item.media_for.replace(/_/g, " ")}</span>
              <a
                href={url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className={styles.mediaLink}
              >
                View
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Round avatar initials used by the list rows and details headers. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
