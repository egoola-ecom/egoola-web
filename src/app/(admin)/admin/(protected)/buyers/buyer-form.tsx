"use client";

import { useState } from "react";
import { BuyerDetail, BuyerInput, BuyerMediaFor, BuyerStatus } from "@/lib/accounts-api";
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

const STATUS_OPTIONS: { value: BuyerStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const MEDIA_FOR_OPTIONS: { value: BuyerMediaFor; label: string }[] = [
  { value: "nid", label: "NID" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "profile_document", label: "Profile Document" },
  { value: "other", label: "Other" },
];

function formatVerified(value: string | null): string {
  return value ? `Verified ${new Date(value).toLocaleDateString()}` : "Not verified";
}

export function BuyerForm({
  mode,
  initial,
  fieldErrors,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: BuyerDetail | null;
  fieldErrors: FieldErrors;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: BuyerInput) => void;
}) {
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [skillsText, setSkillsText] = useState((initial?.skills ?? []).join(", "));
  const [interestsText, setInterestsText] = useState((initial?.interests ?? []).join(", "));
  const [experiences, setExperiences] = useState<ExperienceEntry[]>(
    initial?.experiences ?? [],
  );
  const [educations, setEducations] = useState<EducationEntry[]>(initial?.educations ?? []);

  const geo = useGeographySelection({
    country: initial?.country ?? null,
    state: initial?.state ?? null,
    city: initial?.city ?? null,
    thana: initial?.thana ?? null,
  });

  const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
  const [newDocuments, setNewDocuments] = useState<NewDocumentRow<BuyerMediaFor>[]>([]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");

    const input: BuyerInput = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      status: (data.get("status") as BuyerStatus) ?? "active",
      description: String(data.get("description") ?? ""),
      skills: parseTagList(skillsText),
      interests: parseTagList(interestsText),
      experiences,
      educations,
      address_line: String(data.get("address_line") ?? ""),
      country: geo.countryId,
      state: geo.stateId,
      city: geo.cityId,
      thana: geo.thanaId,
      media_delete_ids: removedMediaIds,
    };
    if (password) input.password = password;
    if (profilePicFile) input.profile_pic = profilePicFile;

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
          fallbackName={initial?.name ?? "New Buyer"}
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
            <ReadonlyField label="Email" value={formatVerified(initial.email_verified_at)} />
            <ReadonlyField label="Phone" value={formatVerified(initial.phone_verified_at)} />
            <ReadonlyField label="Wallet balance" value={formatMoney(initial.wallet_balance)} />
          </>
        )}

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="description">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            className={styles.textarea}
            defaultValue={initial?.description ?? ""}
          />
        </div>

        <p className={styles.sectionDivider}>Address</p>

        <div className={`${styles.field} ${styles.formGridFull}`}>
          <label className={styles.label} htmlFor="address_line">
            Address
          </label>
          <textarea
            id="address_line"
            name="address_line"
            className={styles.textarea}
            defaultValue={initial?.address_line ?? ""}
          />
        </div>

        <GeographyFields geo={geo} />

        <p className={styles.sectionDivider}>Skills &amp; interests</p>

        <TagListField
          id="skills"
          label="Skills"
          value={skillsText}
          onChange={setSkillsText}
          placeholder="Comma-separated"
        />
        <TagListField
          id="interests"
          label="Interests"
          value={interestsText}
          onChange={setInterestsText}
          placeholder="Comma-separated, e.g. Travel, Cooking"
        />

        <p className={styles.sectionDivider}>Work experience</p>
        <ExperienceRepeater idPrefix="exp" value={experiences} onChange={setExperiences} />

        <p className={styles.sectionDivider}>Education</p>
        <EducationRepeater idPrefix="edu" value={educations} onChange={setEducations} />

        <DocumentsSection
          idPrefix="buyer"
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
          {submitting ? "Saving…" : mode === "create" ? "Create Buyer" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
