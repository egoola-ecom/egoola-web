"use client";

import { RegisterBusinessInfo } from "@/lib/seller-register-api";
import { FieldErrors } from "@/lib/use-managed-list";
import { Field, inputClass } from "./field";
import styles from "./seller-form.module.css";

/** Six fields are required whenever a business profile is sent at all. */
export const BUSINESS_REQUIRED = [
  "business_type",
  "main_product",
  "owner_name",
  "employees_range",
  "annual_revenue",
  "established_year",
] as const;

export const BUSINESS_OPTIONAL = [
  "description",
  "public_email",
  "whatsapp",
  "facebook",
  "wechat",
  "skype",
] as const;

/** Every error key the business section shows next to a field. */
export const BUSINESS_ERROR_KEYS: string[] = ["info", ...BUSINESS_REQUIRED, ...BUSINESS_OPTIONAL];

// The backend stores these as free text, so the choices are the form's own.
const EMPLOYEES_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];
const REVENUE_OPTIONS = ["< $50,000", "$50,000 - $250,000", "$250,000 - $1,000,000", "> $1,000,000"];

type Defaults = Partial<Record<(typeof BUSINESS_REQUIRED)[number] | (typeof BUSINESS_OPTIONAL)[number], string | null>>;

/** Options plus the saved value when it is not one of them (free text). */
function withCurrent(options: string[], current: string | null | undefined): string[] {
  return current && !options.includes(current) ? [...options, current] : options;
}

/**
 * The business profile inputs, used by the sign-up form and the seller's own
 * profile. Inputs are uncontrolled (read them with {@link readBusinessInfo});
 * `defaults` fills them from a saved profile. The business profile is
 * optional as a whole, but if any of the six required fields is filled the
 * other five are needed too.
 */
export function BusinessProfileFields({
  errors,
  defaults,
  idPrefix = "reg-b",
}: {
  errors: FieldErrors;
  defaults?: Defaults | null;
  idPrefix?: string;
}) {
  const err = (key: string) => errors[key]?.join(" ");
  const d = defaults ?? {};
  return (
    <>
      {err("info") && (
        <p className={`${styles.fieldError} ${styles.full}`} role="alert">
          {err("info")}
        </p>
      )}
      <Field id={`${idPrefix}-type`} label="Business type" required error={err("business_type")}>
        <input
          id={`${idPrefix}-type`}
          name="business_type"
          className={inputClass(Boolean(err("business_type")))}
          defaultValue={d.business_type ?? ""}
          placeholder="e.g. Retail"
        />
      </Field>
      <Field id={`${idPrefix}-product`} label="Main product" required error={err("main_product")}>
        <input
          id={`${idPrefix}-product`}
          name="main_product"
          className={inputClass(Boolean(err("main_product")))}
          defaultValue={d.main_product ?? ""}
          placeholder="e.g. Shoes"
        />
      </Field>
      <Field id={`${idPrefix}-owner`} label="Owner name" required error={err("owner_name")}>
        <input
          id={`${idPrefix}-owner`}
          name="owner_name"
          className={inputClass(Boolean(err("owner_name")))}
          defaultValue={d.owner_name ?? ""}
        />
      </Field>
      <Field id={`${idPrefix}-employees`} label="Employees" required error={err("employees_range")}>
        <select
          id={`${idPrefix}-employees`}
          name="employees_range"
          className={inputClass(Boolean(err("employees_range")))}
          defaultValue={d.employees_range ?? ""}
        >
          <option value="">Select</option>
          {withCurrent(EMPLOYEES_OPTIONS, d.employees_range).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${idPrefix}-revenue`} label="Annual revenue" required error={err("annual_revenue")}>
        <select
          id={`${idPrefix}-revenue`}
          name="annual_revenue"
          className={inputClass(Boolean(err("annual_revenue")))}
          defaultValue={d.annual_revenue ?? ""}
        >
          <option value="">Select</option>
          {withCurrent(REVENUE_OPTIONS, d.annual_revenue).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${idPrefix}-year`} label="Established year" required error={err("established_year")}>
        <input
          id={`${idPrefix}-year`}
          name="established_year"
          className={inputClass(Boolean(err("established_year")))}
          defaultValue={d.established_year ?? ""}
          inputMode="numeric"
          maxLength={4}
          placeholder="e.g. 2020"
        />
      </Field>
      <Field id={`${idPrefix}-desc`} label="About your business" full error={err("description")}>
        <textarea
          id={`${idPrefix}-desc`}
          name="description"
          className={inputClass(Boolean(err("description")), styles.textarea)}
          defaultValue={d.description ?? ""}
        />
      </Field>
      <Field id={`${idPrefix}-pemail`} label="Public email (optional)" error={err("public_email")}>
        <input
          id={`${idPrefix}-pemail`}
          name="public_email"
          type="email"
          className={inputClass(Boolean(err("public_email")))}
          defaultValue={d.public_email ?? ""}
        />
      </Field>
      <Field id={`${idPrefix}-whatsapp`} label="WhatsApp (optional)" error={err("whatsapp")}>
        <input
          id={`${idPrefix}-whatsapp`}
          name="whatsapp"
          className={inputClass(Boolean(err("whatsapp")))}
          defaultValue={d.whatsapp ?? ""}
        />
      </Field>
      <Field id={`${idPrefix}-facebook`} label="Facebook (optional)" error={err("facebook")}>
        <input
          id={`${idPrefix}-facebook`}
          name="facebook"
          className={inputClass(Boolean(err("facebook")))}
          defaultValue={d.facebook ?? ""}
        />
      </Field>
    </>
  );
}

/**
 * Reads the business inputs from the form. The profile is all or nothing:
 * every business field empty means "skip it" (`info` undefined); the six
 * required ones filled means a profile; anything in between is a problem the
 * caller shows (and must not send).
 */
export function readBusinessInfo(data: FormData): {
  info?: RegisterBusinessInfo;
  problems: FieldErrors;
} {
  const text = (key: string) => String(data.get(key) ?? "").trim();
  const required: Record<string, string> = {};
  for (const key of BUSINESS_REQUIRED) required[key] = text(key);
  const filled = BUSINESS_REQUIRED.filter((key) => required[key]);

  if (filled.length > 0 && filled.length < BUSINESS_REQUIRED.length) {
    const problems: FieldErrors = {
      info: ["Fill in all six business fields, or clear them to skip the profile."],
    };
    for (const key of BUSINESS_REQUIRED) {
      if (!required[key]) problems[key] = ["Required when you add a business profile."];
    }
    return { problems };
  }
  if (filled.length === 0) return { problems: {} };

  const info = { ...required } as unknown as RegisterBusinessInfo;
  for (const key of BUSINESS_OPTIONAL) {
    const value = text(key);
    if (value) info[key] = value;
  }
  return { info, problems: {} };
}
