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
export function GeoSelect({ value, onChange }: { value: GeoValue; onChange: (next: GeoValue) => void }) {
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
  ) => (
    <select
      className="form-control form-control-sm mb-2"
      aria-label={label}
      value={value[key]}
      disabled={parent === ""}
      onChange={(event) => {
        const next = { ...value, [key]: event.target.value };
        for (const k of clears) next[k] = "";
        onChange(next);
      }}
    >
      <option value="">{label}</option>
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {row.name}
        </option>
      ))}
    </select>
  );

  return (
    <>
      {level("country", "Any country", countries, null, ["state", "city", "thana"])}
      {level("state", "Any division", states, value.country, ["city", "thana"])}
      {level("city", "Any district", cities, value.state, ["thana"])}
      {level("thana", "Any thana", thanas, value.city, [])}
    </>
  );
}
