/**
 * EWOS API client.
 *
 * SINGLE SOURCE OF TRUTH for talking to the backend.
 * All requests go through `/api/*` and are proxied to http://localhost:8080
 * by Vite (see vite.config.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  CONTRACT ASSUMPTIONS (adjust to match your OpenAPI spec)
 * ─────────────────────────────────────────────────────────────────────────
 *  POST /api/auth/login
 *      request : { username: string, password: string }
 *      200     : { accessToken: string, refreshToken?: string, user?: UserDto }
 *      4xx/5xx : { message?: string, error?: string, errors?: string[] }
 *
 *  POST /api/auth/logout           (optional; called if it exists)
 *  GET  /api/auth/me               (optional; used to hydrate current user)
 *  GET  /api/users                 (used for Users dashboard card count)
 *      may return either a plain array `UserDto[]` OR a Spring page
 *      `{ content: UserDto[], totalElements: number }` — both are handled.
 *
 *  If any of these endpoints differ, change ONLY this file.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TOKEN_KEY = "ewos.accessToken";
const REFRESH_KEY = "ewos.refreshToken";
const USER_KEY = "ewos.user";

export type UserDto = {
  id?: string | number;
  username?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: Array<string | { name: string }>;
  [k: string]: unknown;
};

export type LoginRequest = { username: string; password: string };
export type LoginResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: UserDto;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

/* -------------------------------------------------------------------------- */
/* Token storage                                                              */
/* -------------------------------------------------------------------------- */

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string, refresh?: string, remember = true) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    if (refresh) store.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

export const userStore = {
  get(): UserDto | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserDto;
    } catch {
      return null;
    }
  },
  set(user: UserDto, remember = true) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(user));
  },
};

/* -------------------------------------------------------------------------- */
/* Core request                                                               */
/* -------------------------------------------------------------------------- */

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = opts;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new ApiError(
      "Unable to reach the server. Please check your connection and try again.",
      0,
      err,
    );
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = extractErrorMessage(data, response.status);
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.message === "string" && d.message.trim()) return d.message;
    if (typeof d.error === "string" && d.error.trim()) return d.error;
    if (typeof d.error_description === "string") return d.error_description as string;
    if (Array.isArray(d.errors) && d.errors.length) {
      return d.errors.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join(", ");
    }
  }
  if (typeof data === "string" && data.trim()) return data;
  if (status === 401) return "Invalid username or password.";
  if (status === 403) return "You are not authorized to perform this action.";
  if (status === 0) return "Network error. Could not reach the server.";
  return `Request failed (${status}).`;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  async logout(): Promise<void> {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } catch {
      // Backend may not expose logout; local token clear is authoritative.
    }
  },

  async me(): Promise<UserDto | null> {
    try {
      return await request<UserDto>("/auth/me");
    } catch {
      return null;
    }
  },
};

export const usersApi = {
  /** Returns the total number of users, whether the endpoint returns an array or a Spring Page. */
  async count(): Promise<number> {
    const data = await request<UserDto[] | { totalElements?: number; content?: UserDto[] }>(
      "/users",
    );
    if (Array.isArray(data)) return data.length;
    if (data && typeof data.totalElements === "number") return data.totalElements;
    if (data && Array.isArray(data.content)) return data.content.length;
    return 0;
  },
};

export function displayName(user: UserDto | null | undefined): string {
  if (!user) return "";
  if (user.fullName) return user.fullName;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.username ?? user.email ?? "User";
}

export function initials(user: UserDto | null | undefined): string {
  const name = displayName(user);
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
