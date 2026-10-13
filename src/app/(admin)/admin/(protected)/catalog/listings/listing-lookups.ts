import { AttributeItem, listAllAttributes } from "@/lib/attribute-api";
import { listAllBrands } from "@/lib/brand-api";
import { listAllMeasurements } from "@/lib/measurement-api";
import {
  listSellerAttributes,
  listSellerBrands,
  listSellerMeasurements,
} from "@/lib/seller-listing-api";

export interface BrandOption {
  id: number;
  name: string;
}

export interface MeasurementOption {
  id: number;
  name: string;
  symbol: string;
}

export interface ListingLookups {
  brands: BrandOption[];
  measurements: MeasurementOption[];
  /** Active attributes with their active values, in the admin's shape (the
   * SKU editor is shared). */
  attributes: AttributeItem[];
}

/** The Bangla name next to the English one, where there is one. */
function both(name: string, nameBn: string | null | undefined): string {
  return nameBn ? `${name} (${nameBn})` : name;
}

/** The dropdown lists the listing form needs, from the admin API or — for a
 * seller — the read-only `/seller/lookups/` lists (active items only). A list
 * that fails to load comes back empty rather than breaking the form. */
export async function loadListingLookups(variant: "admin" | "seller"): Promise<ListingLookups> {
  if (variant === "seller") {
    const [brands, measurements, attributes] = await Promise.all([
      listSellerBrands().catch(() => []),
      listSellerMeasurements().catch(() => []),
      listSellerAttributes().catch(() => []),
    ]);
    return {
      brands,
      measurements,
      attributes: attributes.map((attribute) => ({
        id: attribute.id,
        name: both(attribute.name, attribute.name_bn),
        name_bn: attribute.name_bn,
        description: null,
        description_bn: null,
        is_active: true,
        values: attribute.values.map((value) => ({
          id: value.id,
          name: both(value.name, value.name_bn),
          name_bn: value.name_bn,
          is_active: true,
        })),
        created_by: null,
        creator_name: null,
        creator_type: null,
        created_at: "",
        updated_at: "",
      })),
    };
  }
  const [brands, measurements, attributes] = await Promise.all([
    listAllBrands(true).catch(() => []),
    listAllMeasurements().catch(() => []),
    listAllAttributes(true).catch(() => []),
  ]);
  return { brands, measurements, attributes };
}
