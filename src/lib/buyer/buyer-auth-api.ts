import { ApiError } from "../api";
import { AuthSession, saveSession } from "../auth";
import { API_BASE_URL } from "../env";
import { ENDPOINTS } from "../endpoints";

/** Only `name`, `phone` and `password` are needed. Every other key is left out
 * (not sent as an empty string) when the buyer did not fill it in: an empty
 * `email` is a different thing from no `email`. */
export interface BuyerRegisterInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
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
  /** Makes the request multipart. Without it the request is plain JSON. */
  profile_pic?: File | null;
}

/** The 201 body: the login response plus the full profile. */
export interface BuyerRegisterResult {
  access: string;
  refresh: string;
  id: number;
  name: string;
  phone: string;
  email: string | null;
  profile_pic_url: string | null;
  message: string;
}

export const PROFILE_PIC_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PROFILE_PIC_MAX_BYTES = 5 * 1024 * 1024;

const LIST_KEYS = ["skills", "experiences", "interests", "educations"] as const;
const NUMBER_KEYS = ["country", "state", "city", "thana"] as const;
const TEXT_KEYS = ["email", "description", "address_line"] as const;

/**
 * Public buyer sign-up: `POST /auth/buyer/register/`, NO token, so a plain
 * `fetch` (never `authFetch`). Registration logs the buyer in: the 201 carries
 * the tokens, which are stored under the "buyer" key just as a login would.
 * JSON, or multipart when a photo is attached (no hand-set Content-Type then:
 * the browser adds the multipart boundary).
 */
export async function registerBuyer(input: BuyerRegisterInput): Promise<BuyerRegisterResult> {
  const fields: Record<string, string | number | string[]> = {
    name: input.name,
    phone: input.phone,
    password: input.password,
  };
  for (const key of TEXT_KEYS) {
    const value = input[key]?.trim();
    if (value) fields[key] = value;
  }
  for (const key of NUMBER_KEYS) {
    const value = input[key];
    if (value != null) fields[key] = value;
  }
  for (const key of LIST_KEYS) {
    const value = input[key];
    if (value && value.length > 0) fields[key] = value;
  }

  let init: RequestInit;
  if (input.profile_pic) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      // Lists go as a JSON string: the server reads them as JSON fields.
      formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    }
    formData.append("profile_pic", input.profile_pic);
    init = { method: "POST", body: formData };
  } else {
    init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    };
  }

  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.registerBuyer}`, { ...init, cache: "no-store" });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, response.statusText, body);

  const result = body as BuyerRegisterResult;
  // The server echoes "user" as actor_type; the app stores buyers as "buyer".
  const session: AuthSession = {
    access: result.access,
    refresh: result.refresh,
    actor_type: "buyer",
    id: result.id,
    name: result.name,
    email: result.email ?? "",
    phone: result.phone,
  };
  saveSession(session);
  return result;
}
