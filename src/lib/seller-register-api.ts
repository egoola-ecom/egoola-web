import { ApiError } from "./api";
import { API_BASE_URL } from "./env";

/** The document kinds a seller can attach when signing up. */
export type RegisterMediaFor = "nid" | "birth_certificate" | "certificate" | "other";

/** Limits the server enforces. The form mirrors them so a mistake is caught
 * before the upload — the server stays the authority. */
export const REGISTER_MAX_FILES = 10;
export const REGISTER_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const REGISTER_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const REGISTER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Business profile, sent as a JSON string in `info`. All six of
 * business_type … established_year are required when it is sent at all. */
export interface RegisterBusinessInfo {
  business_type: string;
  main_product: string;
  owner_name: string;
  employees_range: string;
  annual_revenue: string;
  established_year: string;
  description?: string;
  public_email?: string;
  whatsapp?: string;
  facebook?: string;
  wechat?: string;
  skype?: string;
}

export interface RegisterDocument {
  media_for: RegisterMediaFor;
  file: File;
}

export interface SellerRegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  present_address: string;
  permanent_address: string;
  country: number;
  state: number;
  city: number;
  thana?: number | null;
  profile_pic?: File | null;
  documents: RegisterDocument[];
  info?: RegisterBusinessInfo;
}

export interface SellerRegisterResult {
  id: number;
  message: string;
}

/**
 * Public seller sign-up: `POST /auth/seller/register/`, multipart, NO token.
 * A plain `fetch` on purpose — never `authFetch` (there is no session) and
 * never a hand-set Content-Type (the browser adds the multipart boundary).
 * Success is a 201 without a token: the seller cannot log in until an admin
 * approves the account.
 *
 * Documents go as `media_for` + `media_file` PAIRS matched by position, so
 * each `media_for` is appended right before its file.
 */
export async function registerSeller(input: SellerRegisterInput): Promise<SellerRegisterResult> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("email", input.email);
  formData.append("phone", input.phone);
  formData.append("password", input.password);
  formData.append("present_address", input.present_address);
  formData.append("permanent_address", input.permanent_address);
  formData.append("country", String(input.country));
  formData.append("state", String(input.state));
  formData.append("city", String(input.city));
  if (input.thana != null) formData.append("thana", String(input.thana));
  if (input.profile_pic) formData.append("profile_pic", input.profile_pic);
  for (const doc of input.documents) {
    formData.append("media_for", doc.media_for);
    formData.append("media_file", doc.file);
  }
  if (input.info) formData.append("info", JSON.stringify(input.info));

  const response = await fetch(`${API_BASE_URL}/auth/seller/register/`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, body);
  }
  return body as SellerRegisterResult;
}
