// Every backend path the web app calls, grouped by who calls it:
//   auth    sign-in and tokens, shared by all roles
//   public  no sign-in needed
//   buyer   a signed-in buyer
//   seller  a signed-in seller
//   admin   a signed-in admin
// Paths only. Query names such as ?status= stay in the *-api.ts files, next to
// the types they belong to. A path that needs an id is a function, so a missing
// id cannot build a bad address. Each path is the real address on the wire
// (under /api/v1), so searching this file for a path always finds it.

type Id = number | string;

/** A resource with a list address and one address per id. */
const resource = (base: string) => ({
  list: base,
  detail: (id: Id) => `${base}${id}/`,
});

export const ENDPOINTS = {
  auth: {
    login: (actor: "admin" | "seller" | "buyer") => `/auth/${actor}/login/`,
    refresh: "/auth/token/refresh/",
    registerSeller: "/auth/seller/register/",
    registerBuyer: "/auth/buyer/register/",
  },

  public: {
    categories: "/public/catalog/categories/",
    products: resource("/public/catalog/products/"),
    gigs: resource("/public/catalog/gigs/"),
    sellers: resource("/public/sellers/"),
    geography: {
      countries: "/public/geography/countries/",
      states: "/public/geography/states/",
      cities: "/public/geography/cities/",
      thanas: "/public/geography/thanas/",
    },
    paymentGateways: "/public/orders/payment-gateways/",
    banners: "/public/cms/banners/",
  },

  buyer: {
    addresses: resource("/buyer/addresses/"),
    orders: resource("/buyer/orders/"),
    jobs: {
      ...resource("/buyer/jobs/"),
      bids: (jobId: Id) => `/buyer/jobs/${jobId}/bids/`,
      acceptBid: (jobId: Id, bidId: Id) => `/buyer/jobs/${jobId}/bids/${bidId}/accept/`,
    },
    favourites: resource("/buyer/favourites/"),
    cart: {
      root: "/buyer/cart/",
      summary: "/buyer/cart/summary/",
      items: resource("/buyer/cart/items/"),
    },
  },

  seller: {
    me: {
      root: "/seller/me/",
      resubmit: "/seller/me/resubmit/",
      changePassword: "/seller/me/change-password/",
    },
    listings: resource("/seller/listings/"),
    gigs: resource("/seller/gigs/"),
    listingFiles: resource("/seller/listing-files/"),
    lookups: {
      categories: "/seller/lookups/categories/",
      brands: "/seller/lookups/brands/",
      measurements: "/seller/lookups/measurements/",
      attributes: "/seller/lookups/attributes/",
    },
    jobs: {
      ...resource("/seller/jobs/"),
      mine: "/seller/jobs/mine/",
      bids: (jobId: Id) => `/seller/jobs/${jobId}/bids/`,
    },
    bids: resource("/seller/bids/"),
    orders: resource("/seller/orders/"),
  },

  admin: {
    accounts: {
      admins: resource("/accounts/admins/"),
      sellers: { ...resource("/accounts/sellers/"), requests: "/accounts/sellers/requests/" },
      buyers: resource("/accounts/buyers/"),
    },
    catalog: {
      categories: {
        ...resource("/catalog/categories/"),
        tree: "/catalog/categories/tree/",
        parentChain: "/catalog/categories/parent-chain/",
      },
      brands: resource("/catalog/brands/"),
      measurements: resource("/catalog/measurements/"),
      attributes: resource("/catalog/attributes/"),
      attributeValues: resource("/catalog/attribute-values/"),
      listings: {
        ...resource("/catalog/listings/"),
        requests: "/catalog/listings/requests/",
        bulkModerate: "/catalog/listings/bulk-moderate/",
      },
      gigs: {
        ...resource("/catalog/gigs/"),
        requests: "/catalog/gigs/requests/",
        bulkModerate: "/catalog/gigs/bulk-moderate/",
      },
      listingFiles: resource("/catalog/listing-files/"),
    },
    jobs: resource("/catalog/jobs/"),
    bidding: {
      ...resource("/bidding/bids/"),
      accept: (id: Id) => `/bidding/bids/${id}/accept/`,
      reject: (id: Id) => `/bidding/bids/${id}/reject/`,
    },
    dashboard: { summary: "/dashboard/summary/" },
    orders: resource("/orders/orders/"),
    carts: resource("/orders/carts/"),
    wishlists: resource("/engagement/favourites/"),
    paymentGateways: resource("/orders/payment-gateways/"),
    geography: {
      countries: resource("/geography/countries/"),
      states: resource("/geography/states/"),
      cities: resource("/geography/cities/"),
      thanas: resource("/geography/thanas/"),
    },
    cms: {
      banners: resource("/cms/banners/"),
      emailTemplates: resource("/cms/email-templates/"),
      settings: {
        list: "/cms/settings/",
        detail: (key: string) => `/cms/settings/${encodeURIComponent(key)}/`,
      },
      siteLogo: "/cms/site-logo/",
    },
  },
} as const;
