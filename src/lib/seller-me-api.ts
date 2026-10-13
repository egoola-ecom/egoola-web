import type { SellerBusinessInfo, SellerStatus, SellerVerificationStatus } from "./accounts-api";
import { authFetch, getSession, saveSession } from "./auth";
import { EducationEntry, ExperienceEntry, MediaItem } from "./profile-fields";
import type { RegisterBusinessInfo, RegisterMediaFor } from "./seller-register-api";

/** The seller's own profile: `GET /seller/me/`. No password, wallet or change
 * log. `email` and `phone` are shown but cannot be changed (for now). */
export interface SellerMe {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_pic_url: string | null;
  present_address: string;
  permanent_address: string;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  skills: string[] | null;
  education: EducationEntry[] | null;
  experience: ExperienceEntry[] | null;
  interest: string[] | null;
  media: MediaItem<RegisterMediaFor>[];
  business_info: SellerBusinessInfo | null;
  verification_status: SellerVerificationStatus;
  /** The admin's reason when rejected; the seller's own message after a
   * resubmit. Always belongs to the CURRENT status. */
  verification_note: string | null;
  status: SellerStatus;
  is_seller_request: boolean;
  /** verified AND active — the only seller who may use full seller features. */
  can_operate: boolean;
  created_at: string;
  requested_at: string | null;
}

/** Only what changed. Never send status, verification_status, verification_note,
 * is_seller_request, can_operate, created_at or requested_at (read-only), nor
 * email / phone (a different value is a 400). */
export interface SellerMePatch {
  name?: string;
  present_address?: string;
  permanent_address?: string;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  skills?: string[];
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  interest?: string[];
  /** The WHOLE business profile object. */
  info?: RegisterBusinessInfo;
  profile_pic?: File | null;
  /** New documents: `media_for[i]` goes with `media_file[i]`. */
  media_for?: RegisterMediaFor[];
  media_file?: File[];
  media_delete_ids?: number[];
}

const ME_PATH = "/seller/me/";

function hasFiles(patch: SellerMePatch): boolean {
  // Document changes (new files or removals) always go as multipart.
  return (
    Boolean(patch.profile_pic) ||
    (patch.media_file?.length ?? 0) > 0 ||
    (patch.media_delete_ids?.length ?? 0) > 0
  );
}

/** Multipart only when a file is included; plain JSON otherwise. The
 * Content-Type is never set by hand (the browser adds the boundary). */
function buildBody(patch: SellerMePatch): FormData | string {
  if (!hasFiles(patch)) {
    const { profile_pic: _pic, media_file: _files, ...json } = patch;
    void _pic;
    void _files;
    return JSON.stringify(json);
  }
  const form = new FormData();
  const text = ["name", "present_address", "permanent_address"] as const;
  for (const key of text) {
    if (patch[key] !== undefined) form.append(key, patch[key]);
  }
  // An empty value is how multipart says "no id".
  for (const key of ["country", "state", "city", "thana"] as const) {
    const value = patch[key];
    if (value !== undefined) form.append(key, value == null ? "" : String(value));
  }
  for (const key of ["skills", "education", "experience", "interest", "info"] as const) {
    if (patch[key] !== undefined) form.append(key, JSON.stringify(patch[key]));
  }
  if (patch.profile_pic) form.append("profile_pic", patch.profile_pic);
  patch.media_for?.forEach((kind, index) => {
    form.append("media_for", kind);
    const file = patch.media_file?.[index];
    if (file) form.append("media_file", file);
  });
  for (const id of patch.media_delete_ids ?? []) form.append("media_delete_ids", String(id));
  return form;
}

/** Keeps the stored session's switches in step with the server, so the
 * routing after a reload does not use a stale answer. */
function syncSession(me: SellerMe): void {
  const session = getSession("seller");
  if (!session) return;
  saveSession({
    ...session,
    name: me.name,
    verification_status: me.verification_status,
    status: me.status,
    can_operate: me.can_operate,
  });
}

export async function getSellerMe(): Promise<SellerMe> {
  const me = await authFetch<SellerMe>("seller", ME_PATH);
  syncSession(me);
  return me;
}

/** PATCH only what changed. Returns the same body as GET. Always use the
 * URLs in this answer: replaced files are really deleted from storage. */
export async function updateSellerMe(patch: SellerMePatch): Promise<SellerMe> {
  const me = await authFetch<SellerMe>("seller", ME_PATH, {
    method: "PATCH",
    body: buildBody(patch),
  });
  syncSession(me);
  return me;
}

/** Rejected sellers only. Moves the seller to `pending` and back into the
 * admin queue as the newest request; `note` (max 1000) is a message to the
 * reviewer. */
export async function resubmitSeller(note?: string): Promise<SellerMe> {
  const me = await authFetch<SellerMe>("seller", `${ME_PATH}resubmit/`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
  });
  syncSession(me);
  return me;
}

export function changeSellerPassword(currentPassword: string, newPassword: string) {
  return authFetch<{ detail: string }>("seller", `${ME_PATH}change-password/`, {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
