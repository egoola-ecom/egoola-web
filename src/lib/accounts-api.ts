import { authFetch } from "./auth";
import { EducationEntry, ExperienceEntry, MediaItem } from "./profile-fields";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function buildListParams(
  pageSize: number,
  offset: number,
  search: string,
  filters: Record<string, string | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(pageSize));
  params.set("offset", String(offset));
  if (search) params.set("search", search);
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params;
}

/** Appends a value to FormData only when it's actually present. */
function appendIfDefined(formData: FormData, key: string, value: string | undefined): void {
  if (value !== undefined) formData.append(key, value);
}

function appendJsonIfDefined(formData: FormData, key: string, value: unknown): void {
  if (value !== undefined) formData.append(key, JSON.stringify(value));
}

/** `undefined` leaves the location untouched; `null` clears it (an empty
 * value is how multipart says "no id", which the server stores as null). */
function appendGeoIfSet(formData: FormData, key: string, value: number | null | undefined): void {
  if (value !== undefined) formData.append(key, value == null ? "" : String(value));
}

function appendMediaFields(
  formData: FormData,
  mediaFor: string[] | undefined,
  mediaFile: File[] | undefined,
  mediaDeleteIds: number[] | undefined,
): void {
  for (const label of mediaFor ?? []) formData.append("media_for", label);
  for (const file of mediaFile ?? []) formData.append("media_file", file);
  for (const id of mediaDeleteIds ?? []) formData.append("media_delete_ids", String(id));
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminType = "super_admin" | "admin";
export type AdminStatus = "active" | "inactive";
export type AdminMediaFor = "nid" | "birth_certificate" | "profile_document" | "other";

export interface AdminListItem {
  id: number;
  name: string;
  email: string;
  mobile: string;
  profile_pic_url: string | null;
  type: AdminType;
  status: AdminStatus;
  last_logged_at: string | null;
}

export interface AdminDetail extends AdminListItem {
  profile_pic_path: string | null;
  skills: string[] | null;
  experiences: ExperienceEntry[] | null;
  interests: string[] | null;
  educations: EducationEntry[] | null;
  present_address: string | null;
  permanent_address: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  media: MediaItem<AdminMediaFor>[];
}

export interface AdminInput {
  name: string;
  email: string;
  mobile: string;
  password?: string;
  type: AdminType;
  status?: AdminStatus;
  skills?: string[];
  experiences?: ExperienceEntry[];
  interests?: string[];
  educations?: EducationEntry[];
  present_address?: string;
  permanent_address?: string;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  profile_pic?: File | null;
  media_for?: AdminMediaFor[];
  media_file?: File[];
  media_delete_ids?: number[];
}

const ADMINS_PATH = "/accounts/admins/";

/**
 * Always sent as multipart/form-data (the API accepts it for every field,
 * not just files) so a profile picture and new documents can be uploaded
 * in the same request that saves the rest of the form.
 */
function buildAdminFormData(input: Partial<AdminInput>): FormData {
  const formData = new FormData();
  appendIfDefined(formData, "name", input.name);
  appendIfDefined(formData, "email", input.email);
  appendIfDefined(formData, "mobile", input.mobile);
  appendIfDefined(formData, "type", input.type);
  if (input.status) formData.append("status", input.status);
  if (input.password) formData.append("password", input.password);

  appendJsonIfDefined(formData, "skills", input.skills);
  appendJsonIfDefined(formData, "interests", input.interests);
  appendJsonIfDefined(formData, "experiences", input.experiences);
  appendJsonIfDefined(formData, "educations", input.educations);

  appendIfDefined(formData, "present_address", input.present_address);
  appendIfDefined(formData, "permanent_address", input.permanent_address);
  appendGeoIfSet(formData, "country", input.country);
  appendGeoIfSet(formData, "state", input.state);
  appendGeoIfSet(formData, "city", input.city);
  appendGeoIfSet(formData, "thana", input.thana);

  if (input.profile_pic) formData.append("profile_pic", input.profile_pic);
  appendMediaFields(formData, input.media_for, input.media_file, input.media_delete_ids);

  return formData;
}

export function listAdmins(params: URLSearchParams) {
  return authFetch<PaginatedResponse<AdminListItem>>("admin", `${ADMINS_PATH}?${params}`);
}
export function getAdmin(id: number) {
  return authFetch<AdminDetail>("admin", `${ADMINS_PATH}${id}/`);
}
export function createAdmin(input: AdminInput) {
  return authFetch<AdminDetail>("admin", ADMINS_PATH, {
    method: "POST",
    body: buildAdminFormData(input),
  });
}
/** PATCH: send only the fields that changed. */
export function updateAdmin(id: number, input: Partial<AdminInput>) {
  return authFetch<AdminDetail>("admin", `${ADMINS_PATH}${id}/`, {
    method: "PATCH",
    body: buildAdminFormData(input),
  });
}
export function deleteAdmin(id: number) {
  return authFetch<void>("admin", `${ADMINS_PATH}${id}/`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Seller
// ---------------------------------------------------------------------------

export type SellerVerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type SellerStatus = "active" | "inactive" | "suspended";
export type SellerMediaFor =
  | "nid"
  | "birth_certificate"
  | "certificate"
  | "gallery_image"
  | "gallery_video"
  | "other";

export interface SellerListItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_pic_url: string | null;
  verification_status: SellerVerificationStatus;
  status: SellerStatus;
  wallet_balance: string;
  bonus_balance: string;
  last_logged_at: string | null;
  /** Read-only. True while a self-registered seller waits for an admin. */
  is_seller_request: boolean;
  created_at: string;
  /** When the seller joined the queue: sign-up, or the latest resubmit.
   * Null for a seller an admin created. */
  requested_at: string | null;
}

export type SellerVerificationCreatorType = "admin" | "seller" | "user" | "system";

/** One entry in a seller's append-only verification-status change history —
 * server-written, newest first, only present on the detail response. */
export interface SellerVerificationLog {
  id: number;
  verification_status: SellerVerificationStatus;
  verification_note: string | null;
  created_by: number | null;
  creator_type: SellerVerificationCreatorType;
  creator_name: string;
  created_at: string;
}

export interface SellerBusinessInfo {
  business_type: string;
  main_product: string;
  owner_name: string;
  employees_range: string;
  annual_revenue: string;
  established_year: string;
  description?: string | null;
  public_email?: string | null;
  whatsapp?: string | null;
  facebook?: string | null;
  wechat?: string | null;
  skype?: string | null;
}

/** One saved change to a seller's profile, by the seller or an admin.
 * `previous_data` and `new_data` have the SAME keys — only the fields that
 * changed. Read-only, detail response only. */
export interface SellerProfileChangeLog {
  id: number;
  changed_fields: string[];
  previous_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  created_by: number | null;
  creator_type: "admin" | "seller";
  creator_name: string;
  created_at: string;
}

export interface SellerDetail extends SellerListItem {
  profile_pic_path: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  verification_note: string | null;
  skills: string[] | null;
  education: EducationEntry[] | null;
  experience: ExperienceEntry[] | null;
  interest: string[] | null;
  present_address: string | null;
  permanent_address: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  media: MediaItem<SellerMediaFor>[];
  business_info: SellerBusinessInfo | null;
  verification_logs: SellerVerificationLog[];
  profile_change_logs: SellerProfileChangeLog[];
}

/** An admin decision on a seller. Send only what the action changes —
 * `is_seller_request` is read-only and never sent. */
export interface SellerReviewInput {
  verification_status?: SellerVerificationStatus;
  status?: SellerStatus;
  verification_note?: string;
}

export interface SellerInput {
  name: string;
  email: string;
  phone: string;
  password?: string;
  status?: SellerStatus;
  info?: SellerBusinessInfo;
  skills?: string[];
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  interest?: string[];
  present_address?: string;
  permanent_address?: string;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  profile_pic?: File | null;
  media_for?: SellerMediaFor[];
  media_file?: File[];
  media_delete_ids?: number[];
}

const SELLERS_PATH = "/accounts/sellers/";

function buildSellerFormData(input: SellerInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("email", input.email);
  formData.append("phone", input.phone);
  if (input.status) formData.append("status", input.status);
  if (input.password) formData.append("password", input.password);

  appendJsonIfDefined(formData, "info", input.info);
  appendJsonIfDefined(formData, "skills", input.skills);
  appendJsonIfDefined(formData, "interest", input.interest);
  appendJsonIfDefined(formData, "experience", input.experience);
  appendJsonIfDefined(formData, "education", input.education);

  appendIfDefined(formData, "present_address", input.present_address);
  appendIfDefined(formData, "permanent_address", input.permanent_address);
  appendGeoIfSet(formData, "country", input.country);
  appendGeoIfSet(formData, "state", input.state);
  appendGeoIfSet(formData, "city", input.city);
  appendGeoIfSet(formData, "thana", input.thana);

  if (input.profile_pic) formData.append("profile_pic", input.profile_pic);
  appendMediaFields(formData, input.media_for, input.media_file, input.media_delete_ids);

  return formData;
}

export function listSellers(params: URLSearchParams) {
  return authFetch<PaginatedResponse<SellerListItem>>("admin", `${SELLERS_PATH}?${params}`);
}
export function getSeller(id: number) {
  return authFetch<SellerDetail>("admin", `${SELLERS_PATH}${id}/`);
}
export function createSeller(input: SellerInput) {
  return authFetch<SellerDetail>("admin", SELLERS_PATH, {
    method: "POST",
    body: buildSellerFormData(input),
  });
}
export function updateSeller(id: number, input: SellerInput) {
  return authFetch<SellerDetail>("admin", `${SELLERS_PATH}${id}/`, {
    method: "PATCH",
    body: buildSellerFormData(input),
  });
}
export function deleteSeller(id: number) {
  return authFetch<void>("admin", `${SELLERS_PATH}${id}/`, { method: "DELETE" });
}

/** Cursor-paged answer: no `count`, no page numbers — only the opaque
 * `next` / `previous` links, which are followed exactly as given. */
export interface CursorResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

/** `-requested_at` (the default) is the newest request first; a rejected
 * seller who resubmits is requested again, so they jump to the top. */
export type SellerRequestOrdering = "-requested_at" | "requested_at" | "name" | "-name";

/** The Seller Request queue. Pass the filters for the first page, or a
 * `next` link (full URL) to continue — a link already carries every filter. */
export function listSellerRequests(target: URLSearchParams | string) {
  const path =
    typeof target === "string" ? target : `${SELLERS_PATH}requests/?${target}`;
  return authFetch<CursorResponse<SellerListItem>>("admin", path);
}

/** How many requests are waiting. The queue has no count, so the normal list
 * is asked with the same flag. */
export async function countSellerRequests(): Promise<number> {
  const params = new URLSearchParams({ is_seller_request: "true", limit: "1" });
  const res = await listSellers(params);
  return res.count;
}

/** Changes only verification status / account status / note — sent as plain
 * JSON (no files involved) rather than through {@link buildSellerFormData}.
 * Approve is one call with BOTH `verification_status: "verified"` and
 * `status: "active"`. Response includes the freshly updated
 * `verification_logs`. */
export function updateSellerReview(id: number, input: SellerReviewInput) {
  return authFetch<SellerDetail>("admin", `${SELLERS_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Buyer
// ---------------------------------------------------------------------------

export type BuyerStatus = "active" | "suspended";
/** Same allowed labels as Admin documents. */
export type BuyerMediaFor = AdminMediaFor;

export interface BuyerListItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_pic_url: string | null;
  wallet_balance: string;
  status: BuyerStatus;
}

export interface BuyerDetail extends BuyerListItem {
  profile_pic_path: string | null;
  description: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  skills: string[] | null;
  experiences: ExperienceEntry[] | null;
  interests: string[] | null;
  educations: EducationEntry[] | null;
  address_line: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  thana: number | null;
  media: MediaItem<BuyerMediaFor>[];
}

export interface BuyerInput {
  name: string;
  email: string;
  phone: string;
  password?: string;
  status?: BuyerStatus;
  description?: string;
  skills?: string[];
  experiences?: ExperienceEntry[];
  interests?: string[];
  educations?: EducationEntry[];
  address_line?: string;
  country?: number | null;
  state?: number | null;
  city?: number | null;
  thana?: number | null;
  profile_pic?: File | null;
  media_for?: BuyerMediaFor[];
  media_file?: File[];
  media_delete_ids?: number[];
}

const BUYERS_PATH = "/accounts/buyers/";

function buildBuyerFormData(input: Partial<BuyerInput>): FormData {
  const formData = new FormData();
  appendIfDefined(formData, "name", input.name);
  appendIfDefined(formData, "email", input.email);
  appendIfDefined(formData, "phone", input.phone);
  if (input.status) formData.append("status", input.status);
  if (input.password) formData.append("password", input.password);

  appendIfDefined(formData, "description", input.description);
  appendJsonIfDefined(formData, "skills", input.skills);
  appendJsonIfDefined(formData, "interests", input.interests);
  appendJsonIfDefined(formData, "experiences", input.experiences);
  appendJsonIfDefined(formData, "educations", input.educations);

  appendIfDefined(formData, "address_line", input.address_line);
  appendGeoIfSet(formData, "country", input.country);
  appendGeoIfSet(formData, "state", input.state);
  appendGeoIfSet(formData, "city", input.city);
  appendGeoIfSet(formData, "thana", input.thana);

  if (input.profile_pic) formData.append("profile_pic", input.profile_pic);
  appendMediaFields(formData, input.media_for, input.media_file, input.media_delete_ids);

  return formData;
}

export function listBuyers(params: URLSearchParams) {
  return authFetch<PaginatedResponse<BuyerListItem>>("admin", `${BUYERS_PATH}?${params}`);
}
export function getBuyer(id: number) {
  return authFetch<BuyerDetail>("admin", `${BUYERS_PATH}${id}/`);
}
export function createBuyer(input: BuyerInput) {
  return authFetch<BuyerDetail>("admin", BUYERS_PATH, {
    method: "POST",
    body: buildBuyerFormData(input),
  });
}
/** PATCH: send only the fields that changed. */
export function updateBuyer(id: number, input: Partial<BuyerInput>) {
  return authFetch<BuyerDetail>("admin", `${BUYERS_PATH}${id}/`, {
    method: "PATCH",
    body: buildBuyerFormData(input),
  });
}
export function deleteBuyer(id: number) {
  return authFetch<void>("admin", `${BUYERS_PATH}${id}/`, { method: "DELETE" });
}
