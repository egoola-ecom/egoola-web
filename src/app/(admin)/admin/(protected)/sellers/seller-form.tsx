"use client";

import { useState } from "react";
import { SellerDetail, SellerInput, SellerMediaFor, SellerStatus } from "@/lib/accounts-api";
import { EducationEntry, ExperienceEntry } from "@/lib/profile-fields";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors } from "@/lib/use-managed-list";
import { DocumentsSection, NewDocumentRow } from "../_shared/documents-section";
import { EducationRepeater } from "../_shared/education-repeater";
import { ExperienceRepeater } from "../_shared/experience-repeater";
import { GeographyFields } from "../_shared/geography-fields";
import { ProfilePictureField } from "../_shared/profile-picture-field";
import { formatMoney, ReadonlyField } from "../_shared/readonly-field";
import { parseTagList, TagListField } from "../_shared/tag-list-field";
import styles from "../management.module.css";

const STATUS_OPTIONS: { value: SellerStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const MEDIA_FOR_OPTIONS: { value: SellerMediaFor; label: string }[] = [
  { value: "nid", label: "NID" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "certificate", label: "Certificate" },
  { value: "gallery_image", label: "Gallery Image" },
  { value: "gallery_video", label: "Gallery Video" },
  { value: "other", label: "Other" },
];

function formatVerified(value: string | null): string {
  return value ? `Verified ${new Date(value).toLocaleDateString()}` : "Not verified";
}

export function SellerForm({
  mode,
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: SellerDetail | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: SellerInput) => void;
}) {
  const [includeBusinessInfo, setIncludeBusinessInfo] = useState(
    Boolean(initial?.business_info),
  );
  const info = initial?.business_info;

  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [skillsText, setSkillsText] = useState((initial?.skills ?? []).join(", "));
  const [interestText, setInterestText] = useState((initial?.interest ?? []).join(", "));
  const [experience, setExperience] = useState<ExperienceEntry[]>(initial?.experience ?? []);
  const [education, setEducation] = useState<EducationEntry[]>(initial?.education ?? []);

  const geo = useGeographySelection({
    country: initial?.country ?? null,
    state: initial?.state ?? null,
    city: initial?.city ?? null,
    thana: initial?.thana ?? null,
  });

  const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
  const [newDocuments, setNewDocuments] = useState<NewDocumentRow<SellerMediaFor>[]>([]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");

    const input: SellerInput = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      status: (data.get("status") as SellerStatus) ?? "active",
      skills: parseTagList(skillsText),
      interest: parseTagList(interestText),
      experience,
      education,
      present_address: String(data.get("present_address") ?? ""),
      permanent_address: String(data.get("permanent_address") ?? ""),
      country: geo.countryId,
      state: geo.stateId,
      city: geo.cityId,
      thana: geo.thanaId,
      media_delete_ids: removedMediaIds,
    };
    if (password) input.password = password;
    if (profilePicFile) input.profile_pic = profilePicFile;

    if (includeBusinessInfo) {
      const description = String(data.get("description") ?? "").trim();
      const publicEmail = String(data.get("public_email") ?? "").trim();
      input.info = {
        business_type: String(data.get("business_type") ?? ""),
        main_product: String(data.get("main_product") ?? ""),
        owner_name: String(data.get("owner_name") ?? ""),
        employees_range: String(data.get("employees_range") ?? ""),
        annual_revenue: String(data.get("annual_revenue") ?? ""),
        established_year: String(data.get("established_year") ?? ""),
        ...(description ? { description } : {}),
        ...(publicEmail ? { public_email: publicEmail } : {}),
      };
    }

    const docsWithFiles = newDocuments.filter((doc) => doc.file);
    if (docsWithFiles.length > 0) {
      input.media_for = docsWithFiles.map((doc) => doc.mediaFor);
      input.media_file = docsWithFiles.map((doc) => doc.file as File);
    }

    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit}>
      {formError && <p className={styles.errorBanner}>{formError}</p>}

      <div className={styles.formGrid}>
        <ProfilePictureField
          fallbackName={initial?.name ?? "New Seller"}
          initialUrl={initial?.profile_pic_url ?? null}
          onFileChange={setProfilePicFile}
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            className={styles.input}
            defaultValue={initial?.name}
            required
          />
          {fieldErrors.name?.[0] && <p className={styles.fieldError}>{fieldErrors.name[0]}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            defaultValue={initial?.email}
            required
          />
          {fieldErrors.email?.[0] && <p className={styles.fieldError}>{fieldErrors.email[0]}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            className={styles.input}
            defaultValue={initial?.phone}
            required
          />
          {fieldErrors.phone?.[0] && <p className={styles.fieldError}>{fieldErrors.phone[0]}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={styles.input}
            required={mode === "create"}
            placeholder={mode === "edit" ? "••••••••" : undefined}
          />
          {mode === "edit" && (
            <span className={styles.fieldHint}>Leave blank to keep the current password.</span>
          )}
          {fieldErrors.password?.[0] && (
            <p className={styles.fieldError}>{fieldErrors.password[0]}</p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className={styles.select}
            defaultValue={initial?.status ?? "active"}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {initial && (
          <>
            <ReadonlyField label="Verification status" value={initial.verification_status} />
            <ReadonlyField label="Email" value={formatVerified(initial.email_verified_at)} />
            <ReadonlyField label="Phone" value={formatVerified(initial.phone_verified_at)} />
            <ReadonlyField label="Wallet balance" value={formatMoney(initial.wallet_balance)} />
            <ReadonlyField label="Bonus balance" value={formatMoney(initial.bonus_balance)} />
            {initial.verification_note && (
              <ReadonlyField label="Verification note" value={initial.verification_note} />
            )}
          </>
        )}

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={includeBusinessInfo}
            onChange={(event) => setIncludeBusinessInfo(event.target.checked)}
          />
          <span>Include business profile</span>
        </label>

        {includeBusinessInfo && (
          <>
            <p className={styles.sectionDivider}>Business profile</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="business_type">
                Business type
              </label>
              <input
                id="business_type"
                name="business_type"
                className={styles.input}
                defaultValue={info?.business_type}
                required
              />
              {fieldErrors.business_type?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.business_type[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="main_product">
                Main product
              </label>
              <input
                id="main_product"
                name="main_product"
                className={styles.input}
                defaultValue={info?.main_product}
                required
              />
              {fieldErrors.main_product?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.main_product[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="owner_name">
                Owner name
              </label>
              <input
                id="owner_name"
                name="owner_name"
                className={styles.input}
                defaultValue={info?.owner_name}
                required
              />
              {fieldErrors.owner_name?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.owner_name[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="employees_range">
                Employees
              </label>
              <input
                id="employees_range"
                name="employees_range"
                className={styles.input}
                placeholder="e.g. 1-10"
                defaultValue={info?.employees_range}
                required
              />
              {fieldErrors.employees_range?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.employees_range[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="annual_revenue">
                Annual revenue
              </label>
              <input
                id="annual_revenue"
                name="annual_revenue"
                className={styles.input}
                placeholder="e.g. < $50,000"
                defaultValue={info?.annual_revenue}
                required
              />
              {fieldErrors.annual_revenue?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.annual_revenue[0]}</p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="established_year">
                Established year
              </label>
              <input
                id="established_year"
                name="established_year"
                className={styles.input}
                defaultValue={info?.established_year}
                required
              />
              {fieldErrors.established_year?.[0] && (
                <p className={styles.fieldError}>{fieldErrors.established_year[0]}</p>
              )}
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <label className={styles.label} htmlFor="description">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                className={styles.textarea}
                defaultValue={info?.description ?? ""}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="public_email">
                Public email (optional)
              </label>
              <input
                id="public_email"
                name="public_email"
                type="email"
                className={styles.input}
                defaultValue={info?.public_email ?? ""}
              />
            </div>
          </>
        )}

        <p className={styles.sectionDivider}>Address</p>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="present_address">
            Present address
          </label>
          <textarea
            id="present_address"
            name="present_address"
            className={styles.textarea}
            defaultValue={initial?.present_address ?? ""}
          />
        </div>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="permanent_address">
            Permanent address
          </label>
          <textarea
            id="permanent_address"
            name="permanent_address"
            className={styles.textarea}
            defaultValue={initial?.permanent_address ?? ""}
          />
        </div>

        <GeographyFields geo={geo} />

        <p className={styles.sectionDivider}>Skills &amp; interests</p>

        <TagListField
          id="skills"
          label="Skills"
          value={skillsText}
          onChange={setSkillsText}
          placeholder="Comma-separated, e.g. Negotiation, Inventory Management"
        />
        <TagListField
          id="interest"
          label="Interests"
          value={interestText}
          onChange={setInterestText}
          placeholder="Comma-separated"
        />

        <p className={styles.sectionDivider}>Work experience</p>
        <ExperienceRepeater idPrefix="exp" value={experience} onChange={setExperience} />

        <p className={styles.sectionDivider}>Education</p>
        <EducationRepeater idPrefix="edu" value={education} onChange={setEducation} />

        <DocumentsSection
          idPrefix="seller"
          existingMedia={initial?.media ?? []}
          mediaForOptions={MEDIA_FOR_OPTIONS}
          removedMediaIds={removedMediaIds}
          onToggleRemove={(id) =>
            setRemovedMediaIds((ids) =>
              ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id],
            )
          }
          newDocuments={newDocuments}
          onChangeNewDocuments={setNewDocuments}
        />
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className={styles.submitButton} disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create Seller" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
