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

function appendGeoIfSet(formData: FormData, key: string, value: number | null | undefined): void {
  if (value != null) formData.append(key, String(value));
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

export type AdminType = "super_admin" | "admin" | "moderator" | "support";
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
function buildAdminFormData(input: AdminInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("email", input.email);
  formData.append("mobile", input.mobile);
  formData.append("type", input.type);
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
export function updateAdmin(id: number, input: AdminInput) {
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
export type SellerStatus = "active" | "suspended";
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

function buildBuyerFormData(input: BuyerInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("email", input.email);
  formData.append("phone", input.phone);
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
export function updateBuyer(id: number, input: BuyerInput) {
  return authFetch<BuyerDetail>("admin", `${BUYERS_PATH}${id}/`, {
    method: "PATCH",
    body: buildBuyerFormData(input),
  });
}
export function deleteBuyer(id: number) {
  return authFetch<void>("admin", `${BUYERS_PATH}${id}/`, { method: "DELETE" });
}
