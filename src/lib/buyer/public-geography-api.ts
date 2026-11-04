import { publicGet, type QueryValue } from "./public-fetch";
import type { GeoRow, OffsetResult } from "./types";
import { ENDPOINTS } from "../endpoints";

// The four geography lists are limit/offset ({count, next, previous, results}),
// a deliberate exception to the page-based lists. A dropdown needs a whole
// level, so each call walks the offsets until `next` is null. An empty list is
// normal (a city often has no thanas).

const LIMIT = 500;
/** A stop against a server that never ends `next`. */
const MAX_REQUESTS = 50;

async function loadLevel(
  path: string,
  filter: Record<string, QueryValue>,
): Promise<OffsetResult<GeoRow>> {
  const rows: GeoRow[] = [];
  let offset = 0;
  let count = 0;
  for (let i = 0; i < MAX_REQUESTS; i += 1) {
    const part = await publicGet<OffsetResult<GeoRow>>(path, { ...filter, limit: LIMIT, offset });
    rows.push(...part.results);
    count = part.count;
    offset += part.results.length;
    if (!part.next || part.results.length === 0) break;
  }
  return { count, next: null, previous: null, results: rows };
}

export const listCountries = () => loadLevel(ENDPOINTS.public.geography.countries, {});

export const listStates = (country: number) => loadLevel(ENDPOINTS.public.geography.states, { country });

export const listCities = (filter: { country?: number; state?: number }) =>
  loadLevel(ENDPOINTS.public.geography.cities, filter);

export const listThanas = (filter: { country?: number; state?: number; city?: number }) =>
  loadLevel(ENDPOINTS.public.geography.thanas, filter);
