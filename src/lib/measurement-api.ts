import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";
import { ENDPOINTS } from "./endpoints";

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

const MEASUREMENTS = ENDPOINTS.admin.catalog.measurements;

export function listMeasurements(params: URLSearchParams) {
  return authFetch<PaginatedResponse<MeasurementItem>>(
    "admin",
    `${MEASUREMENTS.list}?${params}`,
  );
}

/** Every measurement, following `next` pages — for the listing form's unit
 * dropdown, where one 20-row page would silently drop units. */
export async function listAllMeasurements(): Promise<MeasurementItem[]> {
  const all: MeasurementItem[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const page = await listMeasurements(
      new URLSearchParams({ limit: String(pageSize), offset: String(offset) }),
    );
    all.push(...page.results);
    if (!page.next) break;
  }
  return all;
}

export function createMeasurement(input: MeasurementInput) {
  return authFetch<MeasurementItem>("admin", MEASUREMENTS.list, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMeasurement(id: number, input: MeasurementInput) {
  return authFetch<MeasurementItem>("admin", MEASUREMENTS.detail(id), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMeasurement(id: number) {
  return authFetch<void>("admin", MEASUREMENTS.detail(id), { method: "DELETE" });
}
