"use client";

import { useEffect, useState } from "react";
import {
  GeographyOption,
  listCityOptions,
  listCountryOptions,
  listStateOptions,
  listThanaOptions,
} from "@/lib/geography-api";

function findName(options: GeographyOption[], id: number | null): string | null {
  if (id == null) return null;
  return options.find((opt) => opt.id === id)?.name ?? null;
}

/** Resolves a seller's country/state/city/thana ids to display names —
 * each level's options only need fetching when its parent id is set, same
 * dependency chain as the cascading picker used on the edit form. */
export function useResolvedLocation(ids: {
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
}) {
  const [countries, setCountries] = useState<GeographyOption[]>([]);
  const [states, setStates] = useState<GeographyOption[]>([]);
  const [cities, setCities] = useState<GeographyOption[]>([]);
  const [thanas, setThanas] = useState<GeographyOption[]>([]);

  useEffect(() => {
    listCountryOptions()
      .then((res) => setCountries(res.results))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (ids.country == null) return;
    listStateOptions(ids.country)
      .then((res) => setStates(res.results))
      .catch(() => setStates([]));
  }, [ids.country]);

  useEffect(() => {
    if (ids.state == null) return;
    listCityOptions(ids.state)
      .then((res) => setCities(res.results))
      .catch(() => setCities([]));
  }, [ids.state]);

  useEffect(() => {
    if (ids.city == null) return;
    listThanaOptions(ids.city)
      .then((res) => setThanas(res.results))
      .catch(() => setThanas([]));
  }, [ids.city]);

  return [
    findName(countries, ids.country),
    findName(states, ids.state),
    findName(cities, ids.city),
    findName(thanas, ids.thana),
  ]
    .filter(Boolean)
    .join(" › ");
}
