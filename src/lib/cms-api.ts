import { authFetch } from "./auth";
import { PaginatedResponse } from "./accounts-api";

// ---------------------------------------------------------------------------
// CMS (docs/cms-api-guide.md) — admin-only: Banners, Email Templates, Site
// Settings and the Site Logo, all under /api/v1/cms/. Any admin may use it.
// ---------------------------------------------------------------------------

// --- Banners ---------------------------------------------------------------

export type BannerPlacement = "hero" | "sidebar" | "category";
export type BannerStatus = "active" | "inactive";

export interface BannerItem {
  id: number;
  placement: BannerPlacement;
  heading: string;
  small_heading: string;
  link_url: string;
  image_path: string | null;
  image_url: string | null;
  /** Sidebar banners only. */
  category: number | null;
  status: BannerStatus;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BannerInput {
  placement: BannerPlacement;
  heading: string;
  small_heading: string;
  link_url: string;
  category: number | null;
  status: BannerStatus;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  /** Required on create; on update only a newly chosen file is sent. */
  image?: File | null;
}

const BANNERS_PATH = "/cms/banners/";

export function listBanners(params: URLSearchParams) {
  return authFetch<PaginatedResponse<BannerItem>>("admin", `${BANNERS_PATH}?${params}`);
}

/** Banners are always written as multipart (the image shares the request).
 * Empty optional values are sent as empty strings, which DRF treats like
 * `null` — that is how a schedule limit or a category gets cleared. */
function buildBannerFormData(input: BannerInput): FormData {
  const formData = new FormData();
  formData.append("placement", input.placement);
  formData.append("heading", input.heading);
  formData.append("small_heading", input.small_heading);
  formData.append("link_url", input.link_url);
  formData.append("category", input.category != null ? String(input.category) : "");
  formData.append("status", input.status);
  formData.append("sort_order", String(input.sort_order));
  formData.append("starts_at", input.starts_at ?? "");
  formData.append("ends_at", input.ends_at ?? "");
  if (input.image) formData.append("image", input.image);
  return formData;
}

export function createBanner(input: BannerInput) {
  return authFetch<BannerItem>("admin", BANNERS_PATH, {
    method: "POST",
    body: buildBannerFormData(input),
  });
}

export function updateBanner(id: number, input: BannerInput) {
  return authFetch<BannerItem>("admin", `${BANNERS_PATH}${id}/`, {
    method: "PATCH",
    body: buildBannerFormData(input),
  });
}

export function deleteBanner(id: number) {
  return authFetch<void>("admin", `${BANNERS_PATH}${id}/`, { method: "DELETE" });
}

// --- Email templates -------------------------------------------------------

export interface EmailTemplateItem {
  id: number;
  key: string;
  subject: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** `key` is the stable id application code looks a template up by — only
 * sent on create (the server refuses to change it afterwards). */
export interface EmailTemplateInput {
  key?: string;
  subject: string;
  content: string;
  is_active: boolean;
}

const TEMPLATES_PATH = "/cms/email-templates/";

export function listEmailTemplates(params: URLSearchParams) {
  return authFetch<PaginatedResponse<EmailTemplateItem>>("admin", `${TEMPLATES_PATH}?${params}`);
}

export function createEmailTemplate(input: EmailTemplateInput) {
  return authFetch<EmailTemplateItem>("admin", TEMPLATES_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEmailTemplate(id: number, input: EmailTemplateInput) {
  return authFetch<EmailTemplateItem>("admin", `${TEMPLATES_PATH}${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteEmailTemplate(id: number) {
  return authFetch<void>("admin", `${TEMPLATES_PATH}${id}/`, { method: "DELETE" });
}

// --- Site settings ---------------------------------------------------------

export type SettingValue = unknown;

export interface SettingItem {
  key: string;
  value: SettingValue;
  created_at: string;
  updated_at: string;
}

/** The two keys written only by the Site Logo endpoint — visible in the
 * settings list but read-only there (the server answers 400 otherwise). */
export const RESERVED_SETTING_KEYS = ["site_logo_path", "site_logo_url"];

const SETTINGS_PATH = "/cms/settings/";

export function listSettings(params: URLSearchParams) {
  return authFetch<PaginatedResponse<SettingItem>>("admin", `${SETTINGS_PATH}?${params}`);
}

export function createSetting(input: { key: string; value: SettingValue }) {
  return authFetch<SettingItem>("admin", SETTINGS_PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Settings are addressed by key, not id. */
export function updateSetting(key: string, value: SettingValue) {
  return authFetch<SettingItem>("admin", `${SETTINGS_PATH}${encodeURIComponent(key)}/`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}

export function deleteSetting(key: string) {
  return authFetch<void>("admin", `${SETTINGS_PATH}${encodeURIComponent(key)}/`, {
    method: "DELETE",
  });
}

// --- Site logo -------------------------------------------------------------

export interface SiteLogo {
  path: string | null;
  url: string | null;
}

const LOGO_PATH = "/cms/site-logo/";

export function getSiteLogo() {
  return authFetch<SiteLogo>("admin", LOGO_PATH);
}

export function uploadSiteLogo(image: File) {
  const formData = new FormData();
  formData.append("image", image);
  return authFetch<SiteLogo>("admin", LOGO_PATH, { method: "POST", body: formData });
}

export function deleteSiteLogo() {
  return authFetch<void>("admin", LOGO_PATH, { method: "DELETE" });
}
