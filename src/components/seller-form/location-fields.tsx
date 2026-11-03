"use client";

import { useGeographySelection } from "@/lib/use-geography-selection";
import { FieldErrors } from "@/lib/use-managed-list";
import { Field, inputClass } from "./field";
import styles from "./seller-form.module.css";

/** Country → state → city → thana, cascading. `geo` comes from
 * `useGeographySelection(initial, publicGeographyLoaders)` — the public
 * lists, no token. Thana is optional. */
export function LocationFields({
  geo,
  errors,
  idPrefix = "reg",
  optional = false,
}: {
  geo: ReturnType<typeof useGeographySelection>;
  errors: FieldErrors;
  idPrefix?: string;
  /** Country, state and city are asked for but not required (buyer sign-up). */
  optional?: boolean;
}) {
  const err = (key: string) => errors[key]?.join(" ");
  return (
    <>
      {geo.loadFailed && (
        <p className={`${styles.locationNote} ${styles.full}`} role="alert">
          The country list could not be loaded. Please try again in a moment.
        </p>
      )}
      <Field id={`${idPrefix}-country`} label={optional ? "Country (optional)" : "Country"} required={!optional} error={err("country")}>
        <select
          id={`${idPrefix}-country`}
          className={inputClass(Boolean(err("country")))}
          value={geo.countryId ?? ""}
          onChange={(event) =>
            geo.selectCountry(event.target.value ? Number(event.target.value) : null)
          }
          required={!optional}
        >
          <option value="">Select country</option>
          {geo.countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${idPrefix}-state`} label={optional ? "State (optional)" : "State"} required={!optional} error={err("state")}>
        <select
          id={`${idPrefix}-state`}
          className={inputClass(Boolean(err("state")))}
          value={geo.stateId ?? ""}
          disabled={!geo.countryId}
          onChange={(event) =>
            geo.selectState(event.target.value ? Number(event.target.value) : null)
          }
          required={!optional}
        >
          <option value="">Select state</option>
          {geo.states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${idPrefix}-city`} label={optional ? "City (optional)" : "City"} required={!optional} error={err("city")}>
        <select
          id={`${idPrefix}-city`}
          className={inputClass(Boolean(err("city")))}
          value={geo.cityId ?? ""}
          disabled={!geo.stateId}
          onChange={(event) =>
            geo.selectCity(event.target.value ? Number(event.target.value) : null)
          }
          required={!optional}
        >
          <option value="">Select city</option>
          {geo.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${idPrefix}-thana`} label="Thana (optional)" error={err("thana")}>
        <select
          id={`${idPrefix}-thana`}
          className={inputClass(Boolean(err("thana")))}
          value={geo.thanaId ?? ""}
          disabled={!geo.cityId}
          onChange={(event) =>
            geo.selectThana(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Select thana</option>
          {geo.thanas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
