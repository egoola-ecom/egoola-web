"use client";

import { AdminDetail } from "@/lib/accounts-api";
import { ReadonlyField } from "../_shared/readonly-field";
import {
  DocumentsView,
  EducationView,
  ExperienceView,
} from "../_shared/profile-sections";
import { useResolvedLocation } from "../_shared/use-resolved-location";
import styles from "../management.module.css";

/** Read-only display of everything an Admin Details page shows beyond the
 * header. Editing happens on the separate Admin Update page. */
export function AdminProfileView({ admin }: { admin: AdminDetail }) {
  const location = useResolvedLocation(admin);

  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Profile</h2>

      <div className={styles.formGrid}>
        <ReadonlyField
          label="Last login"
          value={admin.last_logged_at ? new Date(admin.last_logged_at).toLocaleString() : "Never"}
        />
        <ReadonlyField label="Mobile" value={admin.mobile} />

        <p className={styles.sectionDivider}>Address</p>
        <div className={styles.formGridFull}>
          <ReadonlyField label="Present address" value={admin.present_address || "—"} />
        </div>
        <div className={styles.formGridFull}>
          <ReadonlyField label="Permanent address" value={admin.permanent_address || "—"} />
        </div>
        <ReadonlyField label="Location" value={location || "—"} />

        <p className={styles.sectionDivider}>Skills &amp; interests</p>
        <ReadonlyField label="Skills" value={(admin.skills ?? []).join(", ") || "—"} />
        <ReadonlyField label="Interests" value={(admin.interests ?? []).join(", ") || "—"} />

        <ExperienceView entries={admin.experiences} />
        <EducationView entries={admin.educations} />
        <DocumentsView media={admin.media} />
      </div>
    </div>
  );
}
