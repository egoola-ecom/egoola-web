"use client";

import { useState } from "react";
import {
  BUSINESS_ERROR_KEYS,
  BUSINESS_OPTIONAL,
  BUSINESS_REQUIRED,
  BusinessProfileFields,
  readBusinessInfo,
} from "@/components/seller-form/business-profile-fields";
import {
  DocumentRows,
  IDENTITY_KINDS,
  MEDIA_FOR_OPTIONS,
  fileProblem,
  useDocumentRows,
} from "@/components/seller-form/document-rows";
import { Field, inputClass } from "@/components/seller-form/field";
import { LocationFields } from "@/components/seller-form/location-fields";
import {
  EducationRows,
  ExperienceRows,
  TagsField,
  parseTags,
} from "@/components/seller-form/profile-lists";
import styles from "@/components/seller-form/seller-form.module.css";
import { resolveMediaUrl } from "@/lib/env";
import { publicGeographyLoaders } from "@/lib/geography-api";
import { EducationEntry, ExperienceEntry } from "@/lib/profile-fields";
import {
  SellerMe,
  SellerMePatch,
  resubmitSeller,
  updateSellerMe,
} from "@/lib/seller-me-api";
import { REGISTER_IMAGE_TYPES, REGISTER_MAX_FILES } from "@/lib/seller-register-api";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../seller-shell.module.css";
import { useSeller } from "../seller-context";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Shown beside a field for a 400: {"field": ["message"]}. */
function allMessages(errors: FieldErrors): string[] {
  return Object.values(errors)
    .flat()
    .filter((m): m is string => Boolean(m));
}

// ---------------------------------------------------------------------------
// Profile details
// ---------------------------------------------------------------------------

function ProfileDetails({
  initialNotice,
  onSaved,
}: {
  /** The details form starts over after a save, so the "saved" note comes in. */
  initialNotice: string | null;
  onSaved: (message: string) => void;
}) {
  const { me, setMe, reload, handleAuthError } = useSeller();

  const geo = useGeographySelection(
    { country: me.country, state: me.state, city: me.city, thana: me.thana },
    publicGeographyLoaders,
  );
  const [name, setName] = useState(me.name);
  const [presentAddress, setPresentAddress] = useState(me.present_address);
  const [permanentAddress, setPermanentAddress] = useState(me.permanent_address);
  const [skills, setSkills] = useState((me.skills ?? []).join(", "));
  const [interest, setInterest] = useState((me.interest ?? []).join(", "));
  const [education, setEducation] = useState<EducationEntry[]>(me.education ?? []);
  const [experience, setExperience] = useState<ExperienceEntry[]>(me.experience ?? []);
  const [photo, setPhoto] = useState<File | null>(null);
  const [businessOpen, setBusinessOpen] = useState(Boolean(me.business_info));

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [saving, setSaving] = useState(false);
  const err = (key: string) => errors[key]?.join(" ");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setNotice(null);
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const problems: FieldErrors = {};
    const patch: SellerMePatch = {};

    // Only the fields that really changed are sent.
    const nextName = name.trim();
    if (!nextName) problems.name = ["Name cannot be blank."];
    else if (nextName !== me.name) patch.name = nextName;

    const nextPresent = presentAddress.trim();
    if (!nextPresent) problems.present_address = ["Present address cannot be blank."];
    else if (nextPresent !== me.present_address) patch.present_address = nextPresent;

    const nextPermanent = permanentAddress.trim();
    if (!nextPermanent) problems.permanent_address = ["Permanent address cannot be blank."];
    else if (nextPermanent !== me.permanent_address) patch.permanent_address = nextPermanent;

    if (!geo.countryId) problems.country = ["Choose your country."];
    if (!geo.stateId) problems.state = ["Choose your state."];
    if (!geo.cityId) problems.city = ["Choose your city."];
    const locationChanged =
      geo.countryId !== me.country ||
      geo.stateId !== me.state ||
      geo.cityId !== me.city ||
      geo.thanaId !== me.thana;
    if (locationChanged && geo.countryId && geo.stateId && geo.cityId) {
      // The four ids are one branch of the tree: they travel together.
      patch.country = geo.countryId;
      patch.state = geo.stateId;
      patch.city = geo.cityId;
      patch.thana = geo.thanaId;
    }

    const nextSkills = parseTags(skills);
    if (!same(nextSkills, me.skills ?? [])) patch.skills = nextSkills;
    const nextInterest = parseTags(interest);
    if (!same(nextInterest, me.interest ?? [])) patch.interest = nextInterest;

    const nextEducation = education.filter((row) => row.degree || row.institution || row.year);
    if (!same(nextEducation, me.education ?? [])) patch.education = nextEducation;
    const nextExperience = experience.filter(
      (row) => row.title || row.company || row.from || row.to,
    );
    if (!same(nextExperience, me.experience ?? [])) patch.experience = nextExperience;

    // Business profile: the WHOLE object goes as `info`.
    const business = readBusinessInfo(data);
    Object.assign(problems, business.problems);
    if (Object.keys(business.problems).length === 0) {
      if (business.info) {
        const saved = (me.business_info ?? {}) as unknown as Record<string, string | null>;
        const next = business.info as unknown as Record<string, string | undefined>;
        const differs = [...BUSINESS_REQUIRED, ...BUSINESS_OPTIONAL].some(
          (key) => (saved[key] ?? "") !== (next[key] ?? ""),
        );
        if (differs) patch.info = business.info;
      } else if (me.business_info) {
        problems.info = [
          "A saved business profile cannot be removed. Fill in the six required fields.",
        ];
      }
    }
    if (Object.keys(problems).some((key) => BUSINESS_ERROR_KEYS.includes(key))) {
      setBusinessOpen(true);
    }

    if (photo) {
      const problem = fileProblem(photo, REGISTER_IMAGE_TYPES, "JPG, PNG or WEBP");
      if (problem) problems.profile_pic = [problem];
      else patch.profile_pic = photo;
    }

    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }
    setErrors({});
    if (Object.keys(patch).length === 0) {
      setNotice("There is nothing to save: no field was changed.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSellerMe(patch);
      setMe(updated);
      onSaved("Profile saved.");
      void reload();
    } catch (caught) {
      if (!handleAuthError(caught)) {
        const { fieldErrors, message } = parseFieldErrors(caught);
        setErrors(fieldErrors);
        setFormError(message ?? "Please fix the highlighted fields and try again.");
        if (BUSINESS_ERROR_KEYS.some((key) => fieldErrors[key])) setBusinessOpen(true);
      }
    } finally {
      setSaving(false);
    }
  }

  // Server keys with no field of their own (for instance `detail`).
  const shown = new Set([
    "name",
    "present_address",
    "permanent_address",
    "country",
    "state",
    "city",
    "thana",
    "skills",
    "interest",
    "education",
    "experience",
    "profile_pic",
    ...BUSINESS_ERROR_KEYS,
  ]);
  const otherErrors = allMessages(
    Object.fromEntries(Object.entries(errors).filter(([key]) => !shown.has(key))),
  );

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h2 className={styles.sectionTitle}>Your details</h2>
      <p className={styles.sectionHint}>Only the fields you change are saved.</p>

      {formError && (
        <div className={styles.errorSummary} role="alert">
          {formError}
          {otherErrors.length > 0 && (
            <ul>
              {otherErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {notice && (
        <p className={styles.successNote} role="status">
          {notice}
        </p>
      )}

      <section className={styles.section}>
        <div className={styles.avatarRow}>
          {me.profile_pic_url && !photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(me.profile_pic_url) ?? undefined}
              alt="Your profile photo"
              className={styles.avatar}
            />
          ) : (
            <span className={styles.avatarFallback}>{initials(me.name)}</span>
          )}
          <div>
            <label htmlFor="sp-photo" className={styles.sectionHint} style={{ display: "block" }}>
              Profile photo. JPG, PNG or WEBP, 5 MB or smaller.
            </label>
            <input
              id="sp-photo"
              type="file"
              className={styles.fileInput}
              accept={IMAGE_ACCEPT}
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
            {err("profile_pic") && (
              <p className={styles.fieldError} role="alert">
                {err("profile_pic")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.grid}>
          <Field id="sp-name" label="Full name" required error={err("name")}>
            <input
              id="sp-name"
              className={inputClass(Boolean(err("name")))}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
          <Field
            id="sp-email"
            label="Email"
            note="Your email cannot be changed for now."
          >
            <div id="sp-email" className={styles.readonlyValue}>
              {me.email}
            </div>
          </Field>
          <Field
            id="sp-phone"
            label="Phone (your login)"
            note="You log in with this number. It cannot be changed for now."
          >
            <div id="sp-phone" className={styles.readonlyValue}>
              {me.phone}
            </div>
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Address</h3>
        <div className={styles.grid} style={{ marginTop: "0.75rem" }}>
          <Field
            id="sp-present"
            label="Present address"
            required
            full
            error={err("present_address")}
          >
            <textarea
              id="sp-present"
              className={inputClass(Boolean(err("present_address")), styles.textarea)}
              value={presentAddress}
              onChange={(event) => setPresentAddress(event.target.value)}
              required
            />
          </Field>
          <Field
            id="sp-permanent"
            label="Permanent address"
            required
            full
            error={err("permanent_address")}
          >
            <textarea
              id="sp-permanent"
              className={inputClass(Boolean(err("permanent_address")), styles.textarea)}
              value={permanentAddress}
              onChange={(event) => setPermanentAddress(event.target.value)}
              required
            />
          </Field>
          <LocationFields geo={geo} errors={errors} idPrefix="sp" />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Skills and interests</h3>
        <div className={styles.grid} style={{ marginTop: "0.75rem" }}>
          <TagsField
            id="sp-skills"
            label="Skills"
            value={skills}
            onChange={setSkills}
            error={err("skills")}
          />
          <TagsField
            id="sp-interest"
            label="Interests"
            value={interest}
            onChange={setInterest}
            error={err("interest")}
          />
        </div>
        <h3 className={styles.sectionTitle} style={{ margin: "1rem 0 0.6rem" }}>
          Education
        </h3>
        <EducationRows rows={education} onChange={setEducation} />
        {err("education") && (
          <p className={styles.fieldError} role="alert">
            {err("education")}
          </p>
        )}
        <h3 className={styles.sectionTitle} style={{ margin: "1rem 0 0.6rem" }}>
          Experience
        </h3>
        <ExperienceRows rows={experience} onChange={setExperience} />
        {err("experience") && (
          <p className={styles.fieldError} role="alert">
            {err("experience")}
          </p>
        )}
      </section>

      <section className={styles.section} style={{ borderBottom: "none", marginBottom: 0 }}>
        <details
          className={styles.business}
          open={businessOpen}
          onToggle={(event) => setBusinessOpen(event.currentTarget.open)}
        >
          <summary className={styles.businessSummary}>
            Business profile
            <small>{me.business_info ? "Saved" : "Optional"}</small>
          </summary>
          <div className={styles.businessBody}>
            <p className={styles.sectionHint}>
              Fill in all six fields marked *. Leave them all empty to skip it.
            </p>
            <div className={styles.grid}>
              <BusinessProfileFields errors={errors} defaults={me.business_info} idPrefix="sp-b" />
            </div>
          </div>
        </details>
      </section>

      <div className={styles.stickyBar}>
        <span className={styles.fieldNote}>Only changed fields are sent.</span>
        <button type="submit" className={styles.primaryLink} disabled={saving} style={{ border: "none", cursor: "pointer" }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** The seller's uploaded documents. Rules built in (all enforced by the server
 * too):
 *  - at least one NID always remains: removing the last NID is a REPLACE (the
 *    new NID goes in the same request);
 *  - once `verified`, NID and birth certificate are locked;
 *  - always show the URLs of the latest answer: replaced files are deleted. */
function DocumentsCard() {
  const { me, setMe, reload, handleAuthError } = useSeller();
  const verified = me.verification_status === "verified";
  const kinds = verified
    ? MEDIA_FOR_OPTIONS.filter((opt) => !IDENTITY_KINDS.includes(opt.value))
    : MEDIA_FOR_OPTIONS;
  const docs = useDocumentRows([], kinds);
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const remainingNids = me.media.filter(
    (m) => m.media_for === "nid" && !removeIds.includes(m.id),
  ).length;

  function markRemoved(id: number, kind: string) {
    setRemoveIds((ids) => [...ids, id]);
    // Removing the last NID is a replace: make room for the new one.
    if (kind === "nid" && remainingNids === 1 && !docs.rows.some((r) => r.mediaFor === "nid")) {
      docs.add("nid");
    }
  }

  async function save() {
    setNotice(null);
    setErrors({});
    if (removeIds.length === 0 && docs.rows.length === 0) {
      setNotice("Nothing to change: add a document or remove one first.");
      return;
    }
    if (!docs.validate()) return;
    const newNid = docs.rows.some((r) => r.mediaFor === "nid" && r.file);
    if (remainingNids === 0 && !newNid) {
      setErrors({
        media_for: [
          "At least one NID document is required. Upload the new NID in the same request.",
        ],
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSellerMe({
        media_delete_ids: removeIds,
        media_for: docs.rows.map((row) => row.mediaFor),
        media_file: docs.rows.map((row) => row.file!),
      });
      setMe(updated);
      setRemoveIds([]);
      docs.reset();
      setNotice("Documents saved.");
      void reload();
    } catch (caught) {
      if (!handleAuthError(caught)) {
        const { fieldErrors, message } = parseFieldErrors(caught);
        setErrors(message ? { media_for: [message] } : fieldErrors);
      }
    } finally {
      setSaving(false);
    }
  }

  const messages = allMessages(errors);

  return (
    <div className={styles.card} style={{ marginTop: "1.25rem" }}>
      <h2 className={styles.sectionTitle}>Documents</h2>
      <p className={styles.sectionHint}>
        JPG, PNG, WEBP or PDF, 5 MB or smaller each, up to {REGISTER_MAX_FILES} files at a time.
        Keep at least one NID.
      </p>

      {verified && (
        <p className={styles.lockNote}>
          Identity documents are locked after verification. Ask an admin to change them.
        </p>
      )}

      {me.media.length === 0 ? (
        <p className={styles.fieldNote}>No documents yet.</p>
      ) : (
        <div className={styles.docTiles}>
          {me.media.map((media) => {
            const url = resolveMediaUrl(media.media_url);
            const label =
              MEDIA_FOR_OPTIONS.find((opt) => opt.value === media.media_for)?.label ??
              media.media_for;
            const locked = verified && IDENTITY_KINDS.includes(media.media_for);
            const marked = removeIds.includes(media.id);
            const isLastNid = media.media_for === "nid" && remainingNids === 1 && !marked;
            return (
              <div
                key={media.id}
                className={`${styles.docTile} ${marked ? styles.docTileMarked : ""}`}
              >
                <a
                  className={styles.docTilePreview}
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
                <div className={styles.docTileFoot}>
                  <span className={styles.docTileLabel}>{label}</span>
                  {locked ? (
                    <span className={styles.fieldNote}>Locked</span>
                  ) : marked ? (
                    <button
                      type="button"
                      className={styles.linkButton}
                      style={{ padding: 0, textAlign: "left" }}
                      onClick={() => setRemoveIds((ids) => ids.filter((id) => id !== media.id))}
                    >
                      Keep it
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.dangerOutline}
                      onClick={() => markRemoved(media.id, media.media_for)}
                    >
                      {isLastNid ? "Replace" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(docs.rows.length > 0 || removeIds.length > 0) && (
        <h3 className={styles.sectionTitle} style={{ margin: "0.5rem 0 0.6rem" }}>
          New documents
        </h3>
      )}
      {docs.rows.length > 0 && <DocumentRows docs={docs} minRows={0} />}
      {docs.rows.length === 0 && (
        <button type="button" className={styles.addButton} onClick={() => docs.add()}>
          + Add a document
        </button>
      )}

      {messages.length > 0 && (
        <div className={styles.errorSummary} role="alert" style={{ marginTop: "1rem" }}>
          <ul style={{ margin: 0 }}>
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {notice && (
        <p className={styles.successNote} role="status" style={{ marginTop: "1rem" }}>
          {notice}
        </p>
      )}

      <div className={styles.stickyBar} style={{ position: "static" }}>
        <span className={styles.fieldNote}>
          {removeIds.length > 0 && `${removeIds.length} to remove. `}
          {docs.rows.length > 0 && `${docs.rows.length} to add.`}
        </span>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save documents"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resubmit
// ---------------------------------------------------------------------------

function ResubmitCard() {
  const { me, setMe, reload, handleAuthError } = useSeller();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!window.confirm("Send your application to the reviewers again?")) return;
    setBusy(true);
    setError(null);
    try {
      const updated: SellerMe = await resubmitSeller(note.trim() || undefined);
      setMe(updated);
      void reload();
    } catch (caught) {
      if (!handleAuthError(caught)) {
        const { fieldErrors, message } = parseFieldErrors(caught);
        setError(message ?? allMessages(fieldErrors).join(" "));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="resubmit" className={styles.card} style={{ marginTop: "1.25rem" }}>
      <h2 className={styles.sectionTitle}>Resubmit your application</h2>
      {me.verification_note && (
        <p className={styles.errorSummary}>Reason it was rejected: {me.verification_note}</p>
      )}
      <p className={styles.sectionHint}>
        Fix your profile and documents above first, then send the application again. Your
        account stays inactive until an admin approves it.
      </p>
      <Field id="rs-note" label="Message for the reviewer (optional)" note="Up to 1000 characters.">
        <textarea
          id="rs-note"
          className={inputClass(false, styles.textarea)}
          value={note}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.stickyBar} style={{ position: "static" }}>
        <span />
        <button
          type="button"
          className={styles.primaryLink}
          style={{ border: "none", cursor: "pointer" }}
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Sending…" : "Resubmit application"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ProfileClient() {
  const { me } = useSeller();
  // The details form starts from the saved profile; after a save it starts
  // over from the answer, so every field shows what the server stored.
  const [version, setVersion] = useState(0);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  return (
    <div>
      <h1 className={shell.pageTitle}>My profile</h1>
      <p className={shell.pageText}>
        Keep your details and documents up to date. You can edit your profile whatever the state
        of your application is.
      </p>
      <ProfileDetails
        key={version}
        initialNotice={savedNotice}
        onSaved={(message) => {
          setSavedNotice(message);
          setVersion((v) => v + 1);
        }}
      />
      <DocumentsCard />
      {me.verification_status === "rejected" && <ResubmitCard />}
    </div>
  );
}
