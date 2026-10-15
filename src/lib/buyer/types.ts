// Buyer Web data shapes. They follow the public API (egoola-server
// docs/public-api-guide.md) field for field, so the static data can be swapped
// for the real calls later without touching the screens. Money is a string with
// two decimals, as the API returns it.

export interface PageResult<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

export type CategoryType = "product" | "service";

export interface PublicCategory {
  id: number;
  parent: number | null;
  type: CategoryType;
  name: string;
  name_bn: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  has_children: boolean;
}

export interface CategoryRef {
  id: number;
  name: string;
  name_bn: string;
  slug: string;
}

export interface SellerRef {
  id: number;
  name: string;
  profile_pic_url: string | null;
}

export type ListingType = "general" | "used" | "village" | "retail" | "wholesale" | "brand";

export interface BrandRef {
  id: number;
  name: string;
}

export interface MediaItem {
  id: number;
  media_type: "image" | "video" | "document";
  media_url: string;
}

export interface Location {
  country: { id: number; name: string } | null;
  state: { id: number; name: string } | null;
  city: { id: number; name: string } | null;
  thana: { id: number; name: string } | null;
}

// --- Products ----------------------------------------------------------------

export interface ProductRow {
  id: number;
  title: string;
  title_bn: string;
  slug: string;
  listing_type: ListingType;
  category: CategoryRef;
  brand: BrandRef | null;
  image_url: string | null;
  price: string;
  discounted_price: string;
  currency: string;
  in_stock: boolean;
  seller: SellerRef | null;
  created_at: string;
}

export interface SkuVariant {
  attribute: { id: number; name: string; name_bn: string };
  attribute_value: { id: number; name: string; name_bn: string };
}

export interface ProductSku {
  id: number;
  sku: string;
  price: string;
  discounted_price: string;
  is_discount_active: boolean;
  in_stock: boolean;
  /** null when stock is not tracked. */
  available_qty: number | null;
  variants: SkuVariant[];
}

export interface PriceTier {
  id: number;
  min_qty: number;
  max_qty: number | null;
  price: string;
  discounted_price: string;
}

export interface ProductDetail extends ProductRow {
  description: string;
  description_bn: string;
  model: string | null;
  origin: string | null;
  origin_bn: string | null;
  warranty: string | null;
  warranty_bn: string | null;
  measurement: { id: number; name: string; symbol: string } | null;
  min_order_qty: number | null;
  condition_note: string | null;
  condition_note_bn: string | null;
  /** Specs as a flat name -> value list. */
  attributes: Record<string, string> | null;
  location: Location;
  price_tiers: PriceTier[];
  media: MediaItem[];
  skus: ProductSku[];
}

// --- Gigs --------------------------------------------------------------------

export type GigPriceType = "hourly" | "daily" | "weekly" | "monthly" | "fixed";

export interface GigRow {
  id: number;
  title: string;
  title_bn: string;
  slug: string;
  category: CategoryRef;
  image_url: string | null;
  /** The lowest-rate package. */
  price: string;
  discounted_price: string;
  price_type: GigPriceType;
  currency: string;
  delivery_days: number | null;
  urgent: boolean;
  seller: SellerRef;
  created_at: string;
}

export interface GigPackage {
  id: number;
  price_type: GigPriceType;
  price: string;
  discounted_price: string;
  is_discount_active: boolean;
  description: string | null;
  description_bn: string | null;
}

export interface GigDetail extends GigRow {
  description: string;
  description_bn: string;
  package_includes: string | null;
  package_includes_bn: string | null;
  available_from: string | null;
  available_to: string | null;
  location: Location;
  media: MediaItem[];
  packages: GigPackage[];
}

// --- Seller page ---------------------------------------------------------------

export interface PublicSeller {
  id: number;
  name: string;
  profile_pic_url: string | null;
  member_since: string;
  location: { country: string | null; state: string | null; city: string | null; thana: string | null };
  business: {
    business_type: string | null;
    main_product: string | null;
    description: string | null;
    established_year: string | null;
    employees_range: string | null;
  } | null;
  contact: {
    public_email: string | null;
    whatsapp: string | null;
    facebook: string | null;
    wechat: string | null;
    skype: string | null;
  } | null;
  skills: string[] | null;
  education: unknown[] | null;
  experience: unknown[] | null;
  product_count: number;
  gig_count: number;
}
