/** Top-level tabs of the Catalog panel. Kept out of the client component so
 * the server page can validate the `?tab=` query param against it. */
export const CATALOG_TABS = [
  { key: "categories", label: "Categories" },
  { key: "measurements", label: "Measurements" },
  { key: "brands", label: "Brands" },
  { key: "attributes", label: "Attributes" },
] as const;

export type CatalogTabKey = (typeof CATALOG_TABS)[number]["key"];

export function isCatalogTabKey(value: string | undefined): value is CatalogTabKey {
  return CATALOG_TABS.some((tab) => tab.key === value);
}
