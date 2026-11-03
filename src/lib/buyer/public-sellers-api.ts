import { publicGet } from "./public-fetch";
import type { PublicSeller } from "./types";

/** `GET /public/sellers/{id}/`: only a verified and active seller has a page. */
export function getPublicSeller(id: number) {
  return publicGet<PublicSeller>(`/sellers/${id}/`);
}
