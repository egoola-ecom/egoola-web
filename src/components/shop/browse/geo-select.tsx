"use client";

import { useEffect, useState } from "react";
import { listCities, listCountries, listStates, listThanas } from "@/lib/buyer/public-geography-api";
import type { GeoRow } from "@/lib/buyer/types";

export interface GeoValue {
  country: string;
  state: string;
  city: string;
  thana: string;
}

export const EMPTY_GEO: GeoValue = { country: "", state: "", city: "", thana: "" };

/** Country, state, city, thana: each level loads when the one above is picked,
 * and changing a level clears the ones below it. An empty thana list is normal. */
export function GeoSelect({
  value,
  onChange,
  form = false,
  errors = {},
}: {
  value: GeoValue;
  onChange: (next: GeoValue) => void;
  /** Labelled, full-size drop-downs with the server's message under each level. */
  form?: boolean;
  errors?: Partial<Record<keyof GeoValue, string>>;
}) {
  const [countries, setCountries] = useState<GeoRow[]>([]);
  const [states, setStates] = useState<GeoRow[]>([]);
  const [cities, setCities] = useState<GeoRow[]>([]);
  const [thanas, setThanas] = useState<GeoRow[]>([]);

  useEffect(() => {
    listCountries()
      .then((res) => setCountries(res.results))
      .catch(() => setCountries([]));
  }, []);
  useEffect(() => {
    if (!value.country) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStates([]);
      return;
    }
    listStates(Number(value.country))
      .then((res) => setStates(res.results))
      .catch(() => setStates([]));
  }, [value.country]);
  useEffect(() => {
    if (!value.state) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCities([]);
      return;
    }
    listCities({ state: Number(value.state) })
      .then((res) => setCities(res.results))
      .catch(() => setCities([]));
  }, [value.state]);
  useEffect(() => {
    if (!value.city) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThanas([]);
      return;
    }
    listThanas({ country: Number(value.country), state: Number(value.state), city: Number(value.city) })
      .then((res) => setThanas(res.results))
      .catch(() => setThanas([]));
  }, [value.city, value.country, value.state]);

  const level = (
    key: keyof GeoValue,
    label: string,
    rows: GeoRow[],
    parent: string | null,
    clears: (keyof GeoValue)[],
  ) => {
    const error = errors[key];
    const select = (
      <select
        id={form ? `geo-${key}` : undefined}
        className={form ? `form-control${error ? " is-invalid" : ""}` : "form-control form-control-sm mb-2"}
        aria-label={form ? undefined : `Any ${label.toLowerCase()}`}
        value={value[key]}
        disabled={parent === ""}
        onChange={(event) => {
          const next = { ...value, [key]: event.target.value };
          for (const k of clears) next[k] = "";
          onChange(next);
        }}
      >
        <option value="">{form ? `Select ${label.toLowerCase()}` : `Any ${label.toLowerCase()}`}</option>
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
    );
    if (!form) return select;
    return (
      <div className="form-group" data-testid={`geo-${key}`}>
        <label htmlFor={`geo-${key}`}>{label}</label>
        {select}
        {error && (
          <p className="text-danger small mt-1 mb-0" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      {level("country", "Country", countries, null, ["state", "city", "thana"])}
      {level("state", form ? "State" : "Division", states, value.country, ["city", "thana"])}
      {level("city", form ? "City" : "District", cities, value.state, ["thana"])}
      {level("thana", "Thana", thanas, value.city, [])}
      {form && value.city !== "" && thanas.length === 0 && (
        <p className="text-muted small" data-testid="no-thanas">
          No thanas are listed for this city yet.
        </p>
      )}
    </>
  );
}
