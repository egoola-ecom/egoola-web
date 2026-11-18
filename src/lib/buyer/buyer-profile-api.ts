import { authFetch, getSession, saveSession } from "@/lib/auth";
import { ENDPOINTS } from "../endpoints";

// The buyer's own profile (egoola-server docs/buyer/buyer-api-guide.md §6).
// Three separate concerns: the profile, the avatar, the password.

export interface BuyerProfile {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  profile_pic_url: string | null;
  description: string | null;
  address_line: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  skills: string[] | null;
  experiences: string[] | null;
  interests: string[] | null;
  educations: string[] | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  wallet_balance: string;
  status: string;
  created_at: string;
}

/** Only what changed. Never `email` or `phone`: a different value is a 400. */
export interface BuyerProfilePatch {
  name?: string;
  description?: string;
  address_line?: string;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  skills?: string[];
  experiences?: string[];
  interests?: string[];
  educations?: string[];
}

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ME = ENDPOINTS.buyer.me;

/** Keeps the name in the header (read from the stored session) in step. */
function syncSession(me: BuyerProfile): void {
  const session = getSession("buyer");
  if (session && session.name !== me.name) saveSession({ ...session, name: me.name });
}

export async function getProfile(): Promise<BuyerProfile> {
  const me = await authFetch<BuyerProfile>("buyer", ME.root);
  syncSession(me);
  return me;
}

/** `PATCH /buyer/me/` (JSON, no file). Answers with the full profile. */
export async function updateProfile(patch: BuyerProfilePatch): Promise<BuyerProfile> {
  const me = await authFetch<BuyerProfile>("buyer", ME.root, { method: "PATCH", body: JSON.stringify(patch) });
  syncSession(me);
  return me;
}

/** `POST /buyer/me/avatar/` (multipart `image`): sets or replaces the picture. */
export function setAvatar(image: File): Promise<BuyerProfile> {
  const form = new FormData();
  form.append("image", image);
  return authFetch<BuyerProfile>("buyer", ME.avatar, { method: "POST", body: form });
}

/** `DELETE /buyer/me/avatar/`: safe even when there is no avatar. */
export function removeAvatar(): Promise<BuyerProfile> {
  return authFetch<BuyerProfile>("buyer", ME.avatar, { method: "DELETE" });
}

/** The current token keeps working: no re-login. */
export function changePassword(currentPassword: string, newPassword: string) {
  return authFetch<{ detail: string }>("buyer", ME.changePassword, {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
