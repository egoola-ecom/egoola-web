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
  cart: "/buyer/cart",
  profile: "/buyer/profile",
  login: "/login",
  category: (id: number) => `/buyer/category/${id}`,
  gig: (id: number, slug: string) => `/buyer/service/${id}/${slug}`,
  seller: (id: number) => `/buyer/seller/${id}`,
} as const;

export const PRODUCT_TYPES = [
  { slug: "used-mall", label: "Used Mall", image: "/shop/images/categories/1690868876LzSF1SC1Xl.png" },
  { slug: "village-product", label: "Village Product", image: "/shop/images/categories/1690868926jkkr9v2Ec2.png" },
  { slug: "retail-shop", label: "Retail Shop", image: "/shop/images/categories/16908689422kodTAgkop.png" },
  { slug: "wholesale-shop", label: "Wholesale Shop", image: "/shop/images/categories/1690868972OZwApfqbWo.png" },
  { slug: "brand-wall", label: "Brand Wall", image: "/shop/images/categories/1690870031zoWAcZd7V4.png" },
] as const;
