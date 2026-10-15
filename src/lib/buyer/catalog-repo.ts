// Static stand-in for the public catalog API (docs/public-api-guide.md sections
// 3 to 6). Every function is async and takes the same query the API takes, so
// swapping to `fetch` later changes only this file.
import { GIGS, SELLERS } from "./fixtures/gigs";
import { CITIES, COUNTRY, STATES, THANAS, type GeoRow } from "./fixtures/geography";
import { SERVICE_CATEGORIES } from "./fixtures/service-categories";
import { paginate, type PageQuery } from "./paging";
import type {
  CategoryRef,
  CategoryType,
  GigDetail,
  GigPriceType,
  GigRow,
  PageResult,
  PublicCategory,
  PublicSeller,
} from "./types";

const ALL_CATEGORIES: PublicCategory[] = [...SERVICE_CATEGORIES];

export interface CategoryQuery extends PageQuery {
  parent_id?: number;
  search?: string;
  type?: CategoryType;
}

const byOrder = (a: PublicCategory, b: PublicCategory) =>
  a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/** `GET /public/catalog/categories/`: the top level, the children of
 * `parent_id`, or a name search (any level when there is no parent). */
export async function listCategories(query: CategoryQuery = {}): Promise<PageResult<PublicCategory>> {
  let rows = ALL_CATEGORIES;
  if (query.parent_id != null) {
    if (!ALL_CATEGORIES.some((c) => c.id === query.parent_id)) throw new Error("Category not found.");
    rows = rows.filter((c) => c.parent === query.parent_id);
  } else if (!query.search) {
    rows = rows.filter((c) => c.parent === null);
  }
  if (query.type) rows = rows.filter((c) => c.type === query.type);
  const term = query.search?.trim().toLowerCase();
  if (term) rows = rows.filter((c) => c.name.toLowerCase().includes(term) || c.name_bn.toLowerCase().includes(term));
  return paginate([...rows].sort(byOrder), query);
}

/** A category and its ancestors, root first (for breadcrumbs). The API gives the
 * same by calling the list again with each `parent`. */
export async function getCategoryPath(id: number): Promise<PublicCategory[]> {
  const path: PublicCategory[] = [];
  let current = ALL_CATEGORIES.find((c) => c.id === id) ?? null;
  if (!current) throw new Error("Category not found.");
  while (current) {
    path.unshift(current);
    const parentId: number | null = current.parent;
    current = parentId == null ? null : (ALL_CATEGORIES.find((c) => c.id === parentId) ?? null);
  }
  return path;
}

/** Ids of a category and everything below it. */
function subtreeIds(id: number): Set<number> {
  const ids = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of ALL_CATEGORIES) {
      if (c.parent != null && ids.has(c.parent) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

// --- Gigs ------------------------------------------------------------------------

export interface GigQuery extends PageQuery {
  category?: number;
  search?: string;
  seller?: number;
  price_type?: GigPriceType;
  price_min?: number;
  price_max?: number;
  delivery_days_max?: number;
  urgent?: boolean;
  ordering?: "newest" | "oldest" | "price_asc" | "price_desc" | "title";
}

/** The row shows the lowest-rate package (or the filtered one). */
function toRow(gig: GigDetail, priceType?: GigPriceType): GigRow {
  const packages = priceType ? gig.packages.filter((p) => p.price_type === priceType) : gig.packages;
  const pkg = [...packages].sort((a, b) => Number(a.discounted_price) - Number(b.discounted_price))[0];
  return {
    id: gig.id,
    title: gig.title,
    title_bn: gig.title_bn,
    slug: gig.slug,
    category: gig.category,
    image_url: gig.image_url,
    price: pkg.price,
    discounted_price: pkg.discounted_price,
    price_type: pkg.price_type,
    currency: gig.currency,
    delivery_days: gig.delivery_days,
    urgent: gig.urgent,
    seller: gig.seller,
    created_at: gig.created_at,
  };
}

export async function listGigs(query: GigQuery = {}): Promise<PageResult<GigRow>> {
  const ids = query.category != null ? subtreeIds(query.category) : null;
  const term = query.search?.trim().toLowerCase();
  let rows = GIGS.filter((g) => {
    if (ids && !ids.has(g.category.id)) return false;
    if (term && !(g.title.toLowerCase().includes(term) || g.title_bn.toLowerCase().includes(term))) return false;
    if (query.seller != null && g.seller.id !== query.seller) return false;
    if (query.price_type && !g.packages.some((p) => p.price_type === query.price_type)) return false;
    if (query.delivery_days_max != null && (g.delivery_days == null || g.delivery_days > query.delivery_days_max)) return false;
    if (query.urgent != null && g.urgent !== query.urgent) return false;
    return true;
  }).map((g) => toRow(g, query.price_type));
  if (query.price_min != null) rows = rows.filter((r) => Number(r.discounted_price) >= query.price_min!);
  if (query.price_max != null) rows = rows.filter((r) => Number(r.discounted_price) <= query.price_max!);
  const order = query.ordering ?? "newest";
  rows.sort((a, b) => {
    if (order === "oldest") return a.created_at.localeCompare(b.created_at);
    if (order === "price_asc") return Number(a.discounted_price) - Number(b.discounted_price);
    if (order === "price_desc") return Number(b.discounted_price) - Number(a.discounted_price);
    if (order === "title") return a.title.localeCompare(b.title);
    return b.created_at.localeCompare(a.created_at);
  });
  return paginate(rows, query);
}

export async function getGig(id: number): Promise<GigDetail> {
  const gig = GIGS.find((g) => g.id === id);
  if (!gig) throw new Error("Not found.");
  return gig;
}

export async function getSeller(id: number): Promise<PublicSeller> {
  const seller = SELLERS.find((s) => s.id === id);
  if (!seller) throw new Error("Not found.");
  return seller;
}

export type { CategoryRef };

// --- Geography ---------------------------------------------------------------------


/** `GET /public/geography/countries/` etc. The four lists load a whole level, as
 * the dropdowns do. */
export async function listCountries() {
  return [COUNTRY];
}
export async function listStates(country = 126): Promise<GeoRow[]> {
  return STATES.filter((s) => s.country === country);
}
export async function listCities(filter: { country?: number; state?: number } = {}): Promise<GeoRow[]> {
  return CITIES.filter((c) => (filter.state == null || c.state === filter.state) && (filter.country == null || c.country === filter.country));
}
export async function listThanas(city: number): Promise<GeoRow[]> {
  return THANAS.filter((t) => t.city === city);
}
