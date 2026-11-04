// Every Buyer Web route starts with /buyer.
export const SHOP = {
  home: "/buyer",
  services: "/buyer/services",
  projects: "/buyer/projects",
  products: "/buyer/products",
  favourites: "/buyer/favourites",
  notifications: "/buyer/notifications",
  messages: "/buyer/messages",
  orders: "/buyer/orders",
  order: (id: number) => `/buyer/orders/${id}`,
  checkout: (type: string, sellerId: number) => `/buyer/checkout?type=${type}&seller=${sellerId}`,
  cart: "/buyer/cart",
  jobs: "/buyer/jobs",
  newJob: "/buyer/jobs/new",
  job: (id: number) => `/buyer/jobs/${id}`,
  editJob: (id: number) => `/buyer/jobs/${id}/edit`,
  addresses: "/buyer/addresses",
  profile: "/buyer/profile",
  login: "/login",
  categories: "/buyer/categories",
  /** `trail` = the ids above it, root first: there is no "get one category"
   * call, so the names of the ancestors are found by walking down the list. */
  category: (id: number, trail: number[] = []) =>
    `/buyer/category/${id}${trail.length ? `?trail=${trail.join(",")}` : ""}`,
  product: (id: number, slug: string) => `/buyer/product/${id}/${slug}`,
  gig: (id: number, slug: string) => `/buyer/service/${id}/${slug}`,
  seller: (id: number) => `/buyer/seller/${id}`,
} as const;

export const PRODUCT_TYPES = [
  { slug: "used-mall", listingType: "used", label: "Used Mall", image: "/shop/images/categories/1690868876LzSF1SC1Xl.png" },
  { slug: "village-product", listingType: "village", label: "Village Product", image: "/shop/images/categories/1690868926jkkr9v2Ec2.png" },
  { slug: "retail-shop", listingType: "retail", label: "Retail Shop", image: "/shop/images/categories/16908689422kodTAgkop.png" },
  { slug: "wholesale-shop", listingType: "wholesale", label: "Wholesale Shop", image: "/shop/images/categories/1690868972OZwApfqbWo.png" },
  { slug: "brand-wall", listingType: "brand", label: "Brand Wall", image: "/shop/images/categories/1690870031zoWAcZd7V4.png" },
] as const;
