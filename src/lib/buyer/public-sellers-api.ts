import { publicGet } from "./public-fetch";
import type { PublicSeller } from "./types";
import { ENDPOINTS } from "../endpoints";

/** `GET /public/sellers/{id}/`: only a verified and active seller has a page. */
export function getPublicSeller(id: number) {
  return publicGet<PublicSeller>(ENDPOINTS.public.sellers.detail(id));
}
