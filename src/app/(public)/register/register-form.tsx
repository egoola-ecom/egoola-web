"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/seller-form/field";
import { LocationFields } from "@/components/seller-form/location-fields";
import styles from "@/components/seller-form/seller-form.module.css";
import { EyeIcon } from "@/components/eye-icon";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { PROFILE_PIC_MAX_BYTES, PROFILE_PIC_TYPES, registerBuyer } from "@/lib/buyer/buyer-auth-api";
import { loginUrlFor, safeBuyerNext } from "@/lib/buyer/login-redirect";
import { publicGeographyLoaders } from "@/lib/geography-api";
import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import login from "../login/login.module.css";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Every error key that has a place on the form. Anything else the server
 * sends is listed in the summary at the top so it is never lost. */
const SHOWN_KEYS = new Set([
  "name",
  "phone",
  "password",
  "email",
  "profile_pic",
  "description",
  "address_line",
  "country",
  "state",
  "city",
  "thana",
  "skills",
  "experiences",
  "interests",
  "educations",
]);
const DETAIL_KEYS = ["profile_pic", "description", "address_line", "country", "state", "city", "thana", "skills", "experiences", "interests", "educations"];

/** One entry per line, blank lines dropped. */
function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const geo = useGeographySelection({}, publicGeographyLoaders);

  const [showPassword, setShowPassword] = useState(false);
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const err = (key: string) => errors[key]?.join(" ");

  // Already signed in: nothing to register.
  useEffect(() => {
    if (getSession("buyer")) router.replace(safeBuyerNext(next));
  }, [router, next]);

  function showProblems(nextErrors: FieldErrors, message: string | null) {
    setErrors(nextErrors);
    setFormError(message);
    if (DETAIL_KEYS.some((key) => nextErrors[key])) setMoreOpen(true);
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

    // Checks that mirror the server (the server is still the authority).
    const problems: FieldErrors = {};
    if (!text("name")) problems.name = ["This field is required."];
    if (!text("phone")) problems.phone = ["This field is required."];
    if (!String(data.get("password") ?? "")) problems.password = ["This field is required."];
    if (profilePic) {
      if (!PROFILE_PIC_TYPES.includes(profilePic.type)) {
        problems.profile_pic = [`${profilePic.name}: only JPG, PNG or WEBP files are accepted.`];
      } else if (profilePic.size > PROFILE_PIC_MAX_BYTES) {
        problems.profile_pic = [`${profilePic.name}: the photo must be 5 MB or smaller.`];
      }
    }
    if (Object.keys(problems).length > 0) {
      showProblems(problems, "Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      await registerBuyer({
        name: text("name"),
        phone: text("phone"),
        password: String(data.get("password") ?? ""),
        email: text("email"),
        description: text("description"),
        address_line: text("address_line"),
        country: geo.countryId,
        state: geo.stateId,
        city: geo.cityId,
        thana: geo.thanaId,
        skills: lines(String(data.get("skills") ?? "")),
        experiences: lines(String(data.get("experiences") ?? "")),
        interests: lines(String(data.get("interests") ?? "")),
        educations: lines(String(data.get("educations") ?? "")),
        profile_pic: profilePic,
      });
      // Registering also signs the buyer in: go straight to where they were headed.
      router.push(safeBuyerNext(next));
    } catch (caught) {
      if (caught instanceof ApiError) {
        const { fieldErrors, message } = parseFieldErrors(caught);
        showProblems(
          fieldErrors,
          caught.status === 400
            ? (message ?? "Please fix the highlighted fields and try again.")
            : "Something went wrong. Please try again.",
        );
      } else {
        showProblems({}, "Couldn't reach the server. Check your connection and try again.");
      }
      setSubmitting(false);
    }
  }

  // Server errors for keys that have no field of their own.
  const otherErrors = Object.entries(errors).filter(
    ([key, messages]) => !SHOWN_KEYS.has(key) && !key.includes(".") && messages?.length,
  );
  const phoneTaken = errors.phone?.some((message) => /already exists/i.test(message));
  const loginHref = next ? loginUrlFor(safeBuyerNext(next)) : "/login";

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div ref={summaryRef}>
        {formError && (
          <div className={styles.errorSummary} role="alert" data-testid="register-error">
            {formError}
            {otherErrors.length > 0 && (
              <ul>
                {otherErrors.map(([key, messages]) => (
                  <li key={key}>{(messages ?? []).join(" ")}</li>
                ))}
              </ul>
            )}
            {phoneTaken && (
              <p style={{ marginTop: "0.5rem" }}>
                Already have an account?{" "}
                <Link href={loginHref} className={login.signupLink}>
                  Sign in instead.
                </Link>
              </p>
            )}
          </div>
        )}
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your account</h2>
        <p className={styles.sectionHint}>You will sign in with your phone number and password.</p>
        <div className={styles.grid}>
          <Field id="reg-name" label="Full name" required error={err("name")}>
            <input
              id="reg-name"
              name="name"
              className={inputClass(Boolean(err("name")))}
              autoComplete="name"
              autoFocus
            />
          </Field>
          <Field
            id="reg-phone"
            label="Phone (this is your login)"
            required
            error={err("phone")}
            note="Digits only, 6 to 15 of them. It can start with +."
          >
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              className={inputClass(Boolean(err("phone")))}
              autoComplete="tel"
              placeholder="+8801XXXXXXXXX"
            />
          </Field>
          <Field
            id="reg-password"
            label="Password"
            required
            error={err("password")}
            note="At least 8 characters, not a common password, and not only digits."
          >
            <div className={login.passwordWrap}>
              <input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={inputClass(Boolean(err("password")))}
                autoComplete="new-password"
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
          <Field
            id="reg-email"
            label="Email (optional)"
            error={err("email")}
            note="You can also sign in with it. Leave it empty if you prefer."
          >
            <input
              id="reg-email"
              name="email"
              type="email"
              className={inputClass(Boolean(err("email")))}
              autoComplete="email"
            />
          </Field>
        </div>
      </section>

      <section className={styles.section} style={{ borderBottom: "none", marginBottom: "0.5rem" }}>
        <details
          className={styles.business}
          open={moreOpen}
          onToggle={(event) => setMoreOpen(event.currentTarget.open)}
        >
          <summary className={styles.businessSummary} data-testid="more-details">
            More details
            <small>Optional. You can add them later.</small>
          </summary>
          <div className={styles.businessBody}>
            <div className={styles.grid}>
              <Field id="reg-pic" label="Profile photo" full error={err("profile_pic")} note="JPG, PNG or WEBP, 5 MB or smaller.">
                <input
                  id="reg-pic"
                  type="file"
                  className={styles.fileInput}
                  accept={IMAGE_ACCEPT}
                  onChange={(event) => setProfilePic(event.target.files?.[0] ?? null)}
                />
              </Field>
              <Field id="reg-description" label="About you" full error={err("description")}>
                <textarea
                  id="reg-description"
                  name="description"
                  className={inputClass(Boolean(err("description")), styles.textarea)}
                />
              </Field>
              <Field id="reg-address" label="Street address" full error={err("address_line")}>
                <input
                  id="reg-address"
                  name="address_line"
                  className={inputClass(Boolean(err("address_line")))}
                  autoComplete="street-address"
                />
              </Field>
              <LocationFields geo={geo} errors={errors} idPrefix="reg" optional />
              <Field id="reg-skills" label="Skills" full error={err("skills")} note="One per line.">
                <textarea id="reg-skills" name="skills" className={inputClass(Boolean(err("skills")), styles.textarea)} />
              </Field>
              <Field id="reg-experiences" label="Experience" full error={err("experiences")} note="One per line.">
                <textarea id="reg-experiences" name="experiences" className={inputClass(Boolean(err("experiences")), styles.textarea)} />
              </Field>
              <Field id="reg-interests" label="Interests" full error={err("interests")} note="One per line.">
                <textarea id="reg-interests" name="interests" className={inputClass(Boolean(err("interests")), styles.textarea)} />
              </Field>
              <Field id="reg-educations" label="Education" full error={err("educations")} note="One per line.">
                <textarea id="reg-educations" name="educations" className={inputClass(Boolean(err("educations")), styles.textarea)} />
              </Field>
            </div>
          </div>
        </details>
      </section>

      <div className={styles.submitRow}>
        <button type="submit" className={login.submit} disabled={submitting}>
          {submitting ? "Creating your account…" : "Create account"}
        </button>
      </div>
      <p className={styles.signinNote}>
        Already have an account?{" "}
        <Link href={loginHref} className={login.signupLink}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
