import { API_BASE_URL } from "./env";
import { ApiError } from "./api";

export type ActorType = "admin" | "seller" | "buyer";

/** The only two admin roles the backend has. Sent by the admin login only. */
export type AdminRole = "super_admin" | "admin";

export interface AuthSession {
  access: string;
  refresh: string;
  actor_type: ActorType;
  id: number;
  name: string;
  email: string;
  /** Admin sessions only — decides whether Admin Management is available. */
  admin_type?: AdminRole;
  /** Seller sessions only — the two separate switches and what they allow.
   * `can_operate` = verified AND active. Kept fresh from GET /seller/me/. */
  verification_status?: string;
  status?: string;
  can_operate?: boolean;
  /** Seller sessions: the login number (the seller logs in with it). */
  phone?: string;
}

export class AuthError extends Error {
  constructor(public readonly reason: "no_session" | "expired" | "inactive") {
    super(
      reason === "no_session"
        ? "Not signed in."
        : reason === "inactive"
          ? "This account is not active."
          : "Your session has expired. Please sign in again.",
    );
    this.name = "AuthError";
  }
}

function storageKey(actorType: ActorType): string {
  return `egoola_auth_${actorType}`;
}

export function getSession(actorType: ActorType): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(actorType));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  window.localStorage.setItem(storageKey(session.actor_type), JSON.stringify(session));
}

export function clearSession(actorType: ActorType): void {
  window.localStorage.removeItem(storageKey(actorType));
}

/** Stores the tokens from a refresh. The backend rotates refresh tokens, so
 * the new `refresh` replaces the old one — keeping the old one would log the
 * user out on the next refresh. */
function updateTokens(actorType: ActorType, access: string, refresh?: string): void {
  const session = getSession(actorType);
  if (!session) return;
  saveSession({ ...session, access, ...(refresh ? { refresh } : {}) });
}

function extractLoginErrorMessage(body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    // A 400 names the missing field: {"phone": ["This field is required."]}.
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return "Sign in failed. Please try again.";
}

/**
 * Signs in. A SELLER logs in with PHONE + password (typed exactly as at
 * sign-up; surrounding spaces are trimmed); admins and buyers use EMAIL +
 * password. `identifier` is the phone number for a seller, the email for the
 * others. A wrong password and an unknown phone give the same 401 message.
 */
export async function login(
  actorType: ActorType,
  identifier: string,
  password: string,
): Promise<AuthSession> {
  const who = identifier.trim();
  const response = await fetch(`${API_BASE_URL}/auth/${actorType}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(actorType === "seller" ? { phone: who, password } : { email: who, password }),
  });

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(response.status, extractLoginErrorMessage(data), data);
  }

  // Store under the actor type we requested, not the server's own
  // `actor_type` field: the Buyer login endpoint echoes back "user" (its
  // internal model name) instead of "buyer", which would otherwise save
  // the session under the wrong storage key.
  const session: AuthSession = { ...(data as AuthSession), actor_type: actorType };
  saveSession(session);
  return session;
}

export function logout(actorType: ActorType): void {
  clearSession(actorType);
}

// One refresh at a time per actor. With rotating refresh tokens a second,
// parallel refresh would send an already-used token and fail, signing the
// user out for no reason, so concurrent 401s share one in-flight refresh.
const pendingRefresh: Partial<Record<ActorType, Promise<string>>> = {};

function refreshAccessToken(actorType: ActorType): Promise<string> {
  const inFlight = pendingRefresh[actorType];
  if (inFlight) return inFlight;
  const request = doRefresh(actorType).finally(() => {
    delete pendingRefresh[actorType];
  });
  pendingRefresh[actorType] = request;
  return request;
}

async function doRefresh(actorType: ActorType): Promise<string> {
  const session = getSession(actorType);
  if (!session) throw new AuthError("no_session");

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: session.refresh }),
  });

  if (!response.ok) {
    clearSession(actorType);
    throw new AuthError("expired");
  }

  const data = (await response.json()) as { access: string; refresh?: string };
  updateTokens(actorType, data.access, data.refresh);
  return data.access;
}

/**
 * Authenticated fetch for a given actor: attaches the stored access token,
 * and on a 401 transparently refreshes once and retries before giving up.
 * A 401 that survives the refresh means the account itself is no longer
 * allowed in (deactivated admin, suspended seller/buyer): the session is
 * cleared and an AuthError is thrown, which callers turn into a redirect to
 * the login page. A 403 is a different thing (signed in, wrong role) and is
 * left as an ApiError for the screen to show as "not allowed". `path` is
 * normally relative to the API root; a full http(s) URL (a cursor `next`
 * link) is used exactly as given.
 */
export async function authFetch<T>(
  actorType: ActorType,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = getSession(actorType);
  if (!session) throw new AuthError("no_session");

  const isFormData = init.body instanceof FormData;

  const doFetch = (accessToken: string) =>
    fetch(/^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
      cache: "no-store",
    });

  let response = await doFetch(session.access);

  if (response.status === 401) {
    const newAccess = await refreshAccessToken(actorType);
    response = await doFetch(newAccess);
    if (response.status === 401) {
      clearSession(actorType);
      throw new AuthError("inactive");
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, body);
  }

  return body as T;
}
