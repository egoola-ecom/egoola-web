import { publicGet } from "./public-fetch";
import type { PublicBanner } from "./types";
import { ENDPOINTS } from "../endpoints";

export interface BannerQuery {
  placement?: PublicBanner["placement"];
}

/** `GET /public/cms/banners/`: a plain list (no paging) of the banners that
 * are live right now, already ordered by placement then sort order. */
export function listBanners(query: BannerQuery = {}) {
  return publicGet<PublicBanner[]>(ENDPOINTS.public.banners, { ...query });
}
