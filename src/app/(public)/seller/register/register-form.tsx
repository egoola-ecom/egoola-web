"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BusinessProfileFields, BUSINESS_ERROR_KEYS, readBusinessInfo } from "@/components/seller-form/business-profile-fields";
import { DocumentRows, fileProblem, useDocumentRows } from "@/components/seller-form/document-rows";
import { Field, inputClass } from "@/components/seller-form/field";
import { LocationFields } from "@/components/seller-form/location-fields";
import styles from "@/components/seller-form/seller-form.module.css";
import { EyeIcon } from "@/components/eye-icon";
import { ApiError } from "@/lib/api";
import { publicGeographyLoaders } from "@/lib/geography-api";
import {
  REGISTER_IMAGE_TYPES,
  REGISTER_MAX_FILES,
  registerSeller,
} from "@/lib/seller-register-api";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import login from "../../login/login.module.css";

const FILE_IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Every error key the form shows next to a field. Anything else the server
 * sends is listed in the summary at the top so it is never lost. */
const SHOWN_KEYS = new Set([
  "name",
  "email",
  "phone",
  "password",
  "present_address",
  "permanent_address",
  "country",
  "state",
  "city",
  "thana",
  "media_for",
  "media_file",
  "profile_pic",
  ...BUSINESS_ERROR_KEYS,
]);

export function RegisterForm() {
  const geo = useGeographySelection({}, publicGeographyLoaders);
  const docs = useDocumentRows([{ id: 1, mediaFor: "nid", file: null }]);

  const [showPassword, setShowPassword] = useState(false);
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [sameAddress, setSameAddress] = useState(false);

  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [businessOpen, setBusinessOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const err = (key: string) => errors[key]?.join(" ");

  // A rejected seller cannot sign up again: the phone / email are taken. Point
  // them to the login, where they can fix the application and resubmit.
  const alreadyApplied = ["email", "phone"].some((key) =>
    errors[key]?.some((message) => /already exists/i.test(message)),
  );

  function showProblems(next: FieldErrors, message: string | null) {
    setErrors(next);
    setFormError(message);
    // Bring the summary into view so a mistake further down is not missed.
    window.setTimeout(
      () => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();

    // ---- Checks that mirror the server (the server is still the authority).
    const problems: FieldErrors = {};

    const finalPermanent = sameAddress ? presentAddress : permanentAddress;
    if (!geo.countryId) problems.country = ["Choose your country."];
    if (!geo.stateId) problems.state = ["Choose your state."];
    if (!geo.cityId) problems.city = ["Choose your city."];

    const docsOk = docs.validate();
    if (!docs.rows.some((row) => row.mediaFor === "nid" && row.file)) {
      problems.media_for = ["Upload at least one NID document."];
    }
    if (docs.rows.length > REGISTER_MAX_FILES) {
      problems.media_file = [`Upload at most ${REGISTER_MAX_FILES} documents.`];
    }

    if (profilePic) {
      const problem = fileProblem(profilePic, REGISTER_IMAGE_TYPES, "JPG, PNG or WEBP");
      if (problem) problems.profile_pic = [problem];
    }

    // The business profile is all or nothing.
    const business = readBusinessInfo(data);
    if (Object.keys(business.problems).length > 0) {
      setBusinessOpen(true);
      Object.assign(problems, business.problems);
    }

    if (Object.keys(problems).length > 0 || !docsOk) {
      showProblems(problems, "Please fix the highlighted fields and try again.");
      return;
    }

    // ---- Send.
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const result = await registerSeller({
        name: text("name"),
        email: text("email"),
        phone: text("phone"),
        password: String(data.get("password") ?? ""),
        present_address: presentAddress.trim(),
        permanent_address: finalPermanent.trim(),
        country: geo.countryId!,
        state: geo.stateId!,
        city: geo.cityId!,
        thana: geo.thanaId,
        profile_pic: profilePic,
        documents: docs.rows.map((row) => ({ media_for: row.mediaFor, file: row.file! })),
        info: business.info,
      });
      setThanks(result.message);
      window.scrollTo({ top: 0 });
    } catch (caught) {
      if (caught instanceof ApiError) {
        const { fieldErrors, message } = parseFieldErrors(caught);
        if (BUSINESS_ERROR_KEYS.some((key) => fieldErrors[key])) setBusinessOpen(true);
        showProblems(fieldErrors, message ?? "Please fix the highlighted fields and try again.");
      } else {
        showProblems({}, "Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (thanks !== null) {
    return (
      <div className={`${styles.card} ${styles.thanks}`} role="status">
        <span className={styles.thanksIcon} aria-hidden="true">
          ✓
        </span>
        <h2 className={styles.thanksTitle}>Thanks, we&apos;ve got your registration</h2>
        <p className={styles.thanksMessage}>{thanks}</p>
        <p className={styles.thanksNote}>
          Log in now to check and complete your profile. You can start selling once an admin
          approves your account and makes it active.
        </p>
        <div className={styles.thanksActions}>
          <Link href="/login?role=seller" className={styles.primaryLink}>
            Log in to complete your profile
          </Link>
          <Link href="/" className={styles.secondaryLink}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Server errors for keys that have no field of their own.
  const otherErrors = Object.entries(errors).filter(
    ([key, messages]) => !SHOWN_KEYS.has(key) && !key.includes(".") && messages?.length,
  );

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div ref={summaryRef}>
        {formError && (
          <div className={styles.errorSummary} role="alert">
            {formError}
            {otherErrors.length > 0 && (
              <ul>
                {otherErrors.map(([key, messages]) => (
                  <li key={key}>{(messages ?? []).join(" ")}</li>
                ))}
              </ul>
            )}
            {alreadyApplied && (
              <p style={{ marginTop: "0.5rem" }}>
                Already applied?{" "}
                <Link href="/login?role=seller" className={login.signupLink}>
                  Log in to fix your application.
                </Link>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ Account */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your account</h2>
        <p className={styles.sectionHint}>You will log in with your phone number and password.</p>
        <div className={styles.grid}>
          <Field id="reg-name" label="Full name" required error={err("name")}>
            <input
              id="reg-name"
              name="name"
              className={inputClass(Boolean(err("name")))}
              autoComplete="name"
              required
            />
          </Field>
          <Field id="reg-email" label="Email" required error={err("email")}>
            <input
              id="reg-email"
              name="email"
              type="email"
              className={inputClass(Boolean(err("email")))}
              autoComplete="email"
              required
            />
          </Field>
          <Field
            id="reg-phone"
            label="Phone (this is your login)"
            required
            error={err("phone")}
            note="You will log in with this phone number, so remember how you typed it."
          >
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              className={inputClass(Boolean(err("phone")))}
              autoComplete="tel"
              placeholder="+8801XXXXXXXXX"
              required
            />
          </Field>
          <Field
            id="reg-password"
            label="Password"
            required
            error={err("password")}
            note="At least 8 characters, and not only digits."
          >
            <div className={login.passwordWrap}>
              <input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={inputClass(Boolean(err("password")))}
                autoComplete="new-password"
                minLength={8}
                pattern=".*\D.*"
                title="At least 8 characters, and not only digits."
                required
              />
              <button
                type="button"
                className={login.eyeButton}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </Field>
        </div>
      </section>

      {/* ------------------------------------------------ Address */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your address</h2>
        <p className={styles.sectionHint}>Where you live, and your permanent address.</p>

        <div className={styles.grid}>
          <Field
            id="reg-present"
            label="Present address"
            required
            full
            error={err("present_address")}
          >
            <textarea
              id="reg-present"
              className={inputClass(Boolean(err("present_address")), styles.textarea)}
              value={presentAddress}
              onChange={(event) => setPresentAddress(event.target.value)}
              required
            />
          </Field>

          <label className={`${styles.checkRow} ${styles.full}`} htmlFor="reg-same">
            <input
              id="reg-same"
              type="checkbox"
              checked={sameAddress}
              onChange={(event) => setSameAddress(event.target.checked)}
            />
            My permanent address is the same as my present address
          </label>

          <Field
            id="reg-permanent"
            label="Permanent address"
            required
            full
            error={err("permanent_address")}
          >
            <textarea
              id="reg-permanent"
              className={inputClass(Boolean(err("permanent_address")), styles.textarea)}
              value={sameAddress ? presentAddress : permanentAddress}
              onChange={(event) => setPermanentAddress(event.target.value)}
              readOnly={sameAddress}
              required
            />
          </Field>

          <LocationFields geo={geo} errors={errors} idPrefix="reg" />
        </div>
      </section>

      {/* ------------------------------------------------ Documents */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Identity documents<span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionHint}>
          Upload at least one NID. If it has a front and a back, add both. JPG, PNG, WEBP or PDF,
          5 MB or smaller each, up to {REGISTER_MAX_FILES} files.
        </p>
        <DocumentRows docs={docs} />
        {err("media_for") && (
          <p className={styles.fieldError} role="alert">
            {err("media_for")}
          </p>
        )}
        {err("media_file") && (
          <p className={styles.fieldError} role="alert">
            {err("media_file")}
          </p>
        )}
      </section>

      {/* ------------------------------------------------ Profile photo */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile photo (optional)</h2>
        <p className={styles.sectionHint}>A clear photo of you. JPG, PNG or WEBP, 5 MB or smaller.</p>
        <input
          type="file"
          className={styles.fileInput}
          aria-label="Profile photo"
          accept={FILE_IMAGE_ACCEPT}
          onChange={(event) => setProfilePic(event.target.files?.[0] ?? null)}
        />
        {err("profile_pic") && (
          <p className={styles.fieldError} role="alert">
            {err("profile_pic")}
          </p>
        )}
      </section>

      {/* ------------------------------------------------ Business */}
      <section className={styles.section} style={{ borderBottom: "none", marginBottom: "0.5rem" }}>
        <details
          className={styles.business}
          open={businessOpen}
          onToggle={(event) => setBusinessOpen(event.currentTarget.open)}
        >
          <summary className={styles.businessSummary}>
            Business profile
            <small>Optional. You can add it later.</small>
          </summary>
          <div className={styles.businessBody}>
            <p className={styles.sectionHint}>
              If you add it, fill in all six fields marked *. Leave them all empty to skip.
            </p>
            <div className={styles.grid}>
              <BusinessProfileFields errors={errors} idPrefix="reg-b" />
            </div>
          </div>
        </details>
      </section>

      <div className={styles.submitRow}>
        <button type="submit" className={login.submit} disabled={submitting || geo.loadFailed}>
          {submitting ? "Sending…" : "Submit for review"}
        </button>
      </div>
      <p className={styles.signinNote}>
        Already have an account?{" "}
        <Link href="/login?role=seller" className={login.signupLink}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
