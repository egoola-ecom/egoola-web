import { API_BASE_URL } from "./env";
import { ApiError } from "./api";

export type ActorType = "admin" | "seller" | "buyer";

export interface AuthSession {
  access: string;
  refresh: string;
  actor_type: ActorType;
  id: number;
  name: string;
  email: string;
}

export class AuthError extends Error {
  constructor(public readonly reason: "no_session" | "expired") {
    super(
      reason === "no_session"
        ? "Not signed in."
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

function updateAccessToken(actorType: ActorType, access: string): void {
  const session = getSession(actorType);
  if (!session) return;
  saveSession({ ...session, access });
}

function extractLoginErrorMessage(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as Record<string, unknown>).detail;
    if (typeof detail === "string") return detail;
  }
  return "Sign in failed. Please try again.";
}

export async function login(
  actorType: ActorType,
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/${actorType}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

async function refreshAccessToken(actorType: ActorType): Promise<string> {
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

  const data = (await response.json()) as { access: string };
  updateAccessToken(actorType, data.access);
  return data.access;
}

/**
 * Authenticated fetch for a given actor: attaches the stored access token,
 * and on a 401 transparently refreshes once and retries before giving up.
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
    fetch(`${API_BASE_URL}${path}`, {
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
