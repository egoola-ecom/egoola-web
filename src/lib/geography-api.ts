import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

export interface GeographyOption {
  id: number;
  name: string;
}

function toParams(filters: Record<string, number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", "100");
  for (const [key, value] of Object.entries(filters)) {
    if (value != null) params.set(key, String(value));
  }
  return params;
}

export function listCountries() {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/countries/?${toParams({})}`,
  );
}

export function listStates(countryId: number) {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/states/?${toParams({ country: countryId })}`,
  );
}

export function listCities(stateId: number) {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/cities/?${toParams({ state: stateId })}`,
  );
}

export function listThanas(cityId: number) {
  return authFetch<PaginatedResponse<GeographyOption>>(
    "admin",
    `/geography/thanas/?${toParams({ city: cityId })}`,
  );
}
