import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// Measurement — flat reference data (units like Kilogram/kg, Litre/L) used
// by product listings. Admin-only, no single-item retrieve endpoint (List,
// Create, Update-PATCH, Delete only). `slug` is always server-generated from
// `name`, and duplicate names are rejected globally — unlike Category, there
// is no scoping dimension here.
// ---------------------------------------------------------------------------

export interface MeasurementItem {
  id: number;
  name: string;
  slug: string;
  symbol: string;
}

export interface MeasurementInput {
  name: string;
  symbol: string;
}

const MEASUREMENTS_PATH = "/catalog/measurements/";

export function listMeasurements(params: URLSearchParams) {
  return authFetch<PaginatedResponse<MeasurementItem>>(
    "admin",
    `${MEASUREMENTS_PATH}?${params}`,
  );
}

export function createMeasurement(input: MeasurementInput) {
  return authFetch<MeasurementItem>("admin", MEASUREMENTS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMeasurement(id: number, input: MeasurementInput) {
  return authFetch<MeasurementItem>("admin", `${MEASUREMENTS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMeasurement(id: number) {
  return authFetch<void>("admin", `${MEASUREMENTS_PATH}${id}/`, { method: "DELETE" });
}
