"use client";

import { useEffect, useState } from "react";
import { GeographyOption, listCities, listCountries, listStates, listThanas } from "./geography-api";

/**
 * Cascading Country -> State -> City -> Thana selection. Picking a level
 * clears everything below it. Starts from whatever ids the record already
 * has (on edit) and fetches each level's options as its parent is known.
 */
export function useGeographySelection(initial: {
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
}) {
  const [countryId, setCountryId] = useState<number | null>(initial.country ?? null);
  const [stateId, setStateId] = useState<number | null>(initial.state ?? null);
  const [cityId, setCityId] = useState<number | null>(initial.city ?? null);
  const [thanaId, setThanaId] = useState<number | null>(initial.thana ?? null);

  const [countries, setCountries] = useState<GeographyOption[]>([]);
  const [states, setStates] = useState<GeographyOption[]>([]);
  const [cities, setCities] = useState<GeographyOption[]>([]);
  const [thanas, setThanas] = useState<GeographyOption[]>([]);

  useEffect(() => {
    listCountries()
      .then((res) => setCountries(res.results))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!countryId) {
      // Clearing the parent selection clears its dependent list too.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStates([]);
      return;
    }
    listStates(countryId)
      .then((res) => setStates(res.results))
      .catch(() => setStates([]));
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCities([]);
      return;
    }
    listCities(stateId)
      .then((res) => setCities(res.results))
      .catch(() => setCities([]));
  }, [stateId]);

  useEffect(() => {
    if (!cityId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThanas([]);
      return;
    }
    listThanas(cityId)
      .then((res) => setThanas(res.results))
      .catch(() => setThanas([]));
  }, [cityId]);

  function selectCountry(id: number | null) {
    setCountryId(id);
    setStateId(null);
    setCityId(null);
    setThanaId(null);
  }

  function selectState(id: number | null) {
    setStateId(id);
    setCityId(null);
    setThanaId(null);
  }

  function selectCity(id: number | null) {
    setCityId(id);
    setThanaId(null);
  }

  return {
    countryId,
    stateId,
    cityId,
    thanaId,
    countries,
    states,
    cities,
    thanas,
    selectCountry,
    selectState,
    selectCity,
    selectThana: setThanaId,
  };
}
