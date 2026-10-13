"use client";

import { BuyerDetail } from "@/lib/accounts-api";
import { formatMoney, formatVerifiedAt, ReadonlyField } from "../_shared/readonly-field";
import {
  DocumentsView,
  EducationView,
  ExperienceView,
} from "../_shared/profile-sections";
import { useResolvedLocation } from "../_shared/use-resolved-location";
import styles from "../management.module.css";

/** Read-only display of everything a Buyer Details page shows beyond the
 * header. Editing happens on the separate Buyer Update page. */
export function BuyerProfileView({ buyer }: { buyer: BuyerDetail }) {
  const location = useResolvedLocation(buyer);

  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Profile</h2>

      <div className={styles.formGrid}>
        <ReadonlyField label="Email" value={formatVerifiedAt(buyer.email_verified_at)} />
        <ReadonlyField label="Phone" value={formatVerifiedAt(buyer.phone_verified_at)} />
        <ReadonlyField label="Wallet balance" value={formatMoney(buyer.wallet_balance)} />
        {buyer.description && (
          <div className={styles.formGridFull}>
            <ReadonlyField label="About" value={buyer.description} />
          </div>
        )}

        <p className={styles.sectionDivider}>Address</p>
        <div className={styles.formGridFull}>
          <ReadonlyField label="Address" value={buyer.address_line || "—"} />
        </div>
        <ReadonlyField label="Location" value={location || "—"} />

        <p className={styles.sectionDivider}>Skills &amp; interests</p>
        <ReadonlyField label="Skills" value={(buyer.skills ?? []).join(", ") || "—"} />
        <ReadonlyField label="Interests" value={(buyer.interests ?? []).join(", ") || "—"} />

        <ExperienceView entries={buyer.experiences} />
        <EducationView entries={buyer.educations} />
        <DocumentsView media={buyer.media} />
      </div>
    </div>
  );
}
