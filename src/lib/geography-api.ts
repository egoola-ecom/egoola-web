import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// Lightweight dropdown options — used by the Admin/Seller/Buyer address
// pickers (see use-geography-selection.ts), always fetched a full page (100)
// at a time since there's no pagination UI for a <select>.
// ---------------------------------------------------------------------------

export interface GeographyOption {
  id: number;
  name: string;
}

function toOptionParams(filters: Record<string, number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", "100");
  for (const [key, value] of Object.entries(filters)) {
    if (value != null) params.set(key, String(value));
  }
  return params;
}

export function listCountryOptions() {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/countries/?${toOptionParams({})}`,
  );
}

export function listStateOptions(countryId: number) {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/states/?${toOptionParams({ country: countryId })}`,
  );
}

export function listCityOptions(stateId: number) {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/cities/?${toOptionParams({ state: stateId })}`,
  );
}

export function listThanaOptions(cityId: number) {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/thanas/?${toOptionParams({ city: cityId })}`,
  );
}

// ---------------------------------------------------------------------------
// Full management CRUD — Geography admin screen (Country/State/City/Thana).
// Every level is Admin-only, JSON (no file uploads), and has no single-item
// retrieve endpoint: List, Create, Update (PATCH) and Delete only. `slug`
// and the `*_code` field are always server-generated.
// ---------------------------------------------------------------------------

/** Trimmed parent reference nested into a child level's list rows. */
export interface GeoParentRef {
  id: number;
  name: string;
  slug: string;
}

export interface CountryItem {
  id: number;
  name: string;
  slug: string;
  country_code: string;
  flag_url: string | null;
  creator_name: string | null;
  updater_name: string | null;
}

export interface CountryInput {
  name: string;
}

const COUNTRIES_PATH = "/geography/countries/";

export function listCountries(params: URLSearchParams) {
  return authFetch<PaginatedResponse<CountryItem>>("admin", `${COUNTRIES_PATH}?${params}`);
}
export function createCountry(input: CountryInput) {
  return authFetch<CountryItem>("admin", COUNTRIES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateCountry(id: number, input: CountryInput) {
  return authFetch<CountryItem>("admin", `${COUNTRIES_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteCountry(id: number) {
  return authFetch<void>("admin", `${COUNTRIES_PATH}${id}/`, { method: "DELETE" });
}

export interface StateItem {
  id: number;
  name: string;
  slug: string;
  state_code: string;
  flag_url: string | null;
  country: GeoParentRef;
  creator_name: string | null;
  updater_name: string | null;
}

export interface StateInput {
  name: string;
  country: number;
}

const STATES_PATH = "/geography/states/";

export function listStates(params: URLSearchParams) {
  return authFetch<PaginatedResponse<StateItem>>("admin", `${STATES_PATH}?${params}`);
}
export function createState(input: StateInput) {
  return authFetch<{ id: number }>("admin", STATES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateState(id: number, input: Partial<StateInput>) {
  return authFetch<{ id: number }>("admin", `${STATES_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteState(id: number) {
  return authFetch<void>("admin", `${STATES_PATH}${id}/`, { method: "DELETE" });
}

export interface CityItem {
  id: number;
  name: string;
  slug: string;
  city_code: string;
  flag_url: string | null;
  country: GeoParentRef;
  state: GeoParentRef;
  creator_name: string | null;
  updater_name: string | null;
}

export interface CityInput {
  name: string;
  country: number;
  state: number;
}

const CITIES_PATH = "/geography/cities/";

export function listCities(params: URLSearchParams) {
  return authFetch<PaginatedResponse<CityItem>>("admin", `${CITIES_PATH}?${params}`);
}
export function createCity(input: CityInput) {
  return authFetch<{ id: number }>("admin", CITIES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateCity(id: number, input: Partial<CityInput>) {
  return authFetch<{ id: number }>("admin", `${CITIES_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteCity(id: number) {
  return authFetch<void>("admin", `${CITIES_PATH}${id}/`, { method: "DELETE" });
}

export interface ThanaItem {
  id: number;
  name: string;
  slug: string;
  thana_code: string;
  flag_url: string | null;
  country: GeoParentRef;
  state: GeoParentRef;
  city: GeoParentRef;
  creator_name: string | null;
  updater_name: string | null;
}

export interface ThanaInput {
  name: string;
  country: number;
  state: number;
  city: number;
}

const THANAS_PATH = "/geography/thanas/";

export function listThanas(params: URLSearchParams) {
  return authFetch<PaginatedResponse<ThanaItem>>("admin", `${THANAS_PATH}?${params}`);
}
export function createThana(input: ThanaInput) {
  return authFetch<{ id: number }>("admin", THANAS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function updateThana(id: number, input: Partial<ThanaInput>) {
  return authFetch<{ id: number }>("admin", `${THANAS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteThana(id: number) {
  return authFetch<void>("admin", `${THANAS_PATH}${id}/`, { method: "DELETE" });
}
