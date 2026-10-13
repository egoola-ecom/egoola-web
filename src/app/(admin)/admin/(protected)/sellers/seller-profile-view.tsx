"use client";

import { SellerDetail } from "@/lib/accounts-api";
import { formatMoney, formatVerifiedAt, ReadonlyField } from "../_shared/readonly-field";
import { useResolvedLocation } from "../_shared/use-resolved-location";
import styles from "../management.module.css";

/** Read-only display of everything a Seller Details page should show beyond
 * the header — account verification/balances, business profile, address,
 * skills and work history (documents have their own card). Editing any of it happens on the
 * separate Seller Update page (`onUpdateClick` navigates there). */
export function SellerProfileView({ seller }: { seller: SellerDetail }) {
  const location = useResolvedLocation(seller);
  const info = seller.business_info;

  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Profile</h2>

      <div className={styles.formGrid}>
        <ReadonlyField label="Email" value={formatVerifiedAt(seller.email_verified_at)} />
        <ReadonlyField label="Phone" value={formatVerifiedAt(seller.phone_verified_at)} />
        <ReadonlyField label="Wallet balance" value={formatMoney(seller.wallet_balance)} />
        <ReadonlyField label="Bonus balance" value={formatMoney(seller.bonus_balance)} />
        <ReadonlyField label="Signed up" value={new Date(seller.created_at).toLocaleString()} />
        <ReadonlyField
          label="Last requested"
          value={seller.requested_at ? new Date(seller.requested_at).toLocaleString() : "—"}
        />
        <ReadonlyField
          label="Seller request"
          value={seller.is_seller_request ? "Waiting for a decision" : "No (already handled)"}
        />

        {info && (
          <>
            <p className={styles.sectionDivider}>Business profile</p>
            <ReadonlyField label="Business type" value={info.business_type} />
            <ReadonlyField label="Main product" value={info.main_product} />
            <ReadonlyField label="Owner name" value={info.owner_name} />
            <ReadonlyField label="Employees" value={info.employees_range} />
            <ReadonlyField label="Annual revenue" value={info.annual_revenue} />
            <ReadonlyField label="Established year" value={info.established_year} />
            {info.description && (
              <div className={styles.formGridFull}>
                <ReadonlyField label="Description" value={info.description} />
              </div>
            )}
            {info.public_email && (
              <ReadonlyField label="Public email" value={info.public_email} />
            )}
          </>
        )}

        <p className={styles.sectionDivider}>Address</p>
        <div className={styles.formGridFull}>
          <ReadonlyField label="Present address" value={seller.present_address || "—"} />
        </div>
        <div className={styles.formGridFull}>
          <ReadonlyField label="Permanent address" value={seller.permanent_address || "—"} />
        </div>
        <ReadonlyField label="Location" value={location || "—"} />

        <p className={styles.sectionDivider}>Skills &amp; interests</p>
        <ReadonlyField label="Skills" value={(seller.skills ?? []).join(", ") || "—"} />
        <ReadonlyField label="Interests" value={(seller.interest ?? []).join(", ") || "—"} />

        {(seller.experience ?? []).length > 0 && (
          <>
            <p className={styles.sectionDivider}>Work experience</p>
            <div className={styles.repeatGroup}>
              {(seller.experience ?? []).map((exp, index) => (
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
        )}

        {(seller.education ?? []).length > 0 && (
          <>
            <p className={styles.sectionDivider}>Education</p>
            <div className={styles.repeatGroup}>
              {(seller.education ?? []).map((edu, index) => (
                <div key={index} className={styles.repeatRow}>
                  <ReadonlyField label="Degree" value={edu.degree} />
                  <ReadonlyField label="Institution" value={edu.institution} />
                  <ReadonlyField label="Year" value={edu.year} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
