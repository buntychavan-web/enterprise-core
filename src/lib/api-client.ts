/**
 * EWOS API client.
 *
 * SINGLE SOURCE OF TRUTH for talking to the backend.
 * All requests go through `/api/v1/*` and are proxied to http://localhost:8080
 * by Vite (see vite.config.ts). The backend mounts every controller under
 * `/api/v1/...` (confirmed against source: AuthController, UserController,
 * EmployeeController, OrganizationUnit(Type)Controller, Attendance*Controller,
 * Leave*Controller, PayslipController) — there is no un-versioned `/api/*`
 * route on the backend. Sprint 13 fixed this file from a stale `/api/*`
 * assumption; see SPRINT_13_COMPLETION_REPORT.md for the mismatch report.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  TENANT ID — KNOWN GAP, NOT FIXED HERE
 * ─────────────────────────────────────────────────────────────────────────
 *  Every tenant-scoped controller (Employees, Organization, Attendance,
 *  Leave, Payroll) requires a `tenantId` — either as an `X-Tenant-Id` header
 *  or a `tenantId` query/body field — and there is currently NO backend
 *  endpoint that lists or resolves tenants. The Tenant/Company module was
 *  rejected during the mid-2026 architecture reset and never rebuilt.
 *  `DEFAULT_TENANT_ID` / `DEFAULT_COMPANY_ID` below are placeholders so
 *  requests are well-formed and reach the backend instead of failing
 *  client-side; they are NOT a real tenant resolution and must be replaced
 *  once a Tenant module exists. Do not treat data returned under this id as
 *  meaningful multi-tenant behavior.
 * ─────────────────────────────────────────────────────────────────────────
 *  CONTRACT ASSUMPTIONS (adjust to match your OpenAPI spec)
 * ─────────────────────────────────────────────────────────────────────────
 *  POST /api/v1/auth/login
 *      request : { username: string, password: string }
 *      200     : { accessToken: string, refreshToken?: string, user?: UserDto }
 *      4xx/5xx : { message?: string, error?: string, errors?: string[] }
 *
 *  POST /api/v1/auth/logout        (optional; called if it exists)
 *  GET  /api/v1/auth/me            (optional; used to hydrate current user)
 *  GET  /api/v1/users              (used for Users dashboard card count)
 *      may return either a plain array `UserDto[]` OR a Spring page
 *      `{ content: UserDto[], totalElements: number }` — both are handled.
 *
 *  If any of these endpoints differ, change ONLY this file.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TOKEN_KEY = "ewos.accessToken";
const REFRESH_KEY = "ewos.refreshToken";
const USER_KEY = "ewos.user";

/** See "TENANT ID — KNOWN GAP" note above. */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

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
    // Every tenant-scoped backend controller requires this header. Sending it
    // unconditionally is harmless for endpoints that ignore it (auth, users).
    headers["X-Tenant-Id"] = DEFAULT_TENANT_ID;
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
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

/* -------------------------------------------------------------------------- */
/* Provider Dashboard (Sprint 14.2)                                          */
/* -------------------------------------------------------------------------- */

export type ProviderDashboardClient = {
  id: string;
  code: string;
  legalName: string;
  status: string;
};

export type ProviderDashboardPeriod = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
};

export type ProviderDashboardRun = {
  id: string;
  companyId: string;
  status: string;
  runType: string;
};

export type ProviderDashboardSummary = {
  assignedClients: ProviderDashboardClient[];
  activePayrollPeriods: ProviderDashboardPeriod[];
  payrollStatusCounts: Record<string, number>;
  pendingApprovals: ProviderDashboardRun[];
  payrollCalendar: ProviderDashboardPeriod[];
  activeServiceCount: number;
  totalServiceCount: number;
};

export const providerDashboardApi = {
  /** Returns null when the endpoint isn't available yet (404) instead of throwing. */
  async get(): Promise<ProviderDashboardSummary | null> {
    try {
      return await request<ProviderDashboardSummary>("/payroll/provider-dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Data Exchange (Sprint 14.3)                                               */
/* -------------------------------------------------------------------------- */

export type DataExchangeStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "RETRY"
  | "ACKNOWLEDGED"
  | "CANCELLED";

export type DataExchangeRecordDto = {
  id: string;
  tenantId: string;
  companyId: string;
  exchangeType: string;
  sourceEventType?: string;
  correlationId: string;
  payloadJson?: string;
  status: DataExchangeStatus;
  retryCount: number;
  nextRetryAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type DataExchangeHistoryEntry = {
  id: string;
  fromStatus?: DataExchangeStatus;
  toStatus: DataExchangeStatus;
  actorId?: string;
  notes?: string;
  occurredAt: string;
};

export const dataExchangeApi = {
  async list(companyId: string, status?: DataExchangeStatus): Promise<DataExchangeRecordDto[]> {
    const qs = status ? `&status=${status}` : "";
    return request<DataExchangeRecordDto[]>(`/data-exchange?companyId=${companyId}${qs}`);
  },
  async getById(id: string): Promise<DataExchangeRecordDto> {
    return request<DataExchangeRecordDto>(`/data-exchange/${id}`);
  },
  async history(id: string): Promise<DataExchangeHistoryEntry[]> {
    return request<DataExchangeHistoryEntry[]>(`/data-exchange/${id}/history`);
  },
  async retry(id: string): Promise<DataExchangeRecordDto> {
    return request<DataExchangeRecordDto>(`/data-exchange/${id}/retry`, { method: "POST" });
  },
  async acknowledge(id: string): Promise<DataExchangeRecordDto> {
    return request<DataExchangeRecordDto>(`/data-exchange/${id}/acknowledge`, { method: "POST" });
  },
  async cancel(id: string): Promise<DataExchangeRecordDto> {
    return request<DataExchangeRecordDto>(`/data-exchange/${id}/cancel`, { method: "POST" });
  },
};

/* -------------------------------------------------------------------------- */
/* Workflow (generic engine, reused for Client Approval — Sprint 14.3)       */
/* -------------------------------------------------------------------------- */

export type WorkflowInstanceDto = {
  id: string;
  tenantId: string;
  companyId: string;
  definitionId: string;
  definitionCode: string;
  subjectType: string;
  subjectId: string;
  currentStateCode: string;
  status: "RUNNING" | "COMPLETED" | "CANCELLED" | "ERROR";
  startedAt: string;
  completedAt?: string;
};

export type WorkflowHistoryEntry = {
  id: string;
  fromStateCode?: string;
  toStateCode: string;
  actionCode: string;
  actorId?: string;
  notes?: string;
  occurredAt: string;
};

export type WorkflowTaskDto = {
  id: string;
  instanceId: string;
  stateCode: string;
  assigneeActorType: "USER" | "EMPLOYEE" | "ROLE" | "SYSTEM";
  assigneeActorId?: string;
  assigneeRoleCode?: string;
  status: "OPEN" | "CLAIMED" | "COMPLETED" | "CANCELLED" | "ESCALATED";
  dueAt?: string;
};

export const workflowApi = {
  async getInstance(id: string): Promise<WorkflowInstanceDto> {
    return request<WorkflowInstanceDto>(`/workflow/instances/${id}`);
  },
  async findBySubject(subjectType: string, subjectId: string): Promise<WorkflowInstanceDto[]> {
    return request<WorkflowInstanceDto[]>(
      `/workflow/instances?subjectType=${subjectType}&subjectId=${subjectId}`,
    );
  },
  async historyOf(instanceId: string): Promise<WorkflowHistoryEntry[]> {
    return request<WorkflowHistoryEntry[]>(`/workflow/instances/${instanceId}/history`);
  },
  async tasksOfInstance(instanceId: string): Promise<WorkflowTaskDto[]> {
    return request<WorkflowTaskDto[]>(`/workflow/tasks/of-instance/${instanceId}`);
  },
  async tasksByRole(roleCode: string): Promise<WorkflowTaskDto[]> {
    return request<WorkflowTaskDto[]>(`/workflow/tasks/by-role?roleCode=${roleCode}`);
  },
  async claimTask(taskId: string): Promise<WorkflowTaskDto> {
    return request<WorkflowTaskDto>(`/workflow/tasks/${taskId}/claim`, { method: "POST" });
  },
  async completeTask(
    taskId: string,
    payload: { actionCode: string; outcomeCode?: string; notes?: string },
  ): Promise<WorkflowTaskDto> {
    return request<WorkflowTaskDto>(`/workflow/tasks/${taskId}/complete`, {
      method: "POST",
      body: payload,
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Generic REST resource                                                      */
/* -------------------------------------------------------------------------- */

export type ResourceRecord = Record<string, unknown> & { id?: string | number };

export type ResourceListResult<T> = {
  items: T[];
  total: number;
  /** true when the endpoint returned 404 (not yet implemented by backend). */
  unavailable: boolean;
};

export type ResourceApiOptions = {
  /** Appended as a query string to the list call, e.g. { tenantId } for search endpoints
   *  that bind tenantId from query params rather than the X-Tenant-Id header. */
  extraQuery?: Record<string, string>;
  /** Merged into create/update payloads for fields the backend requires but the UI
   *  form doesn't collect (tenantId, companyId, ...). */
  extraBody?: Record<string, unknown>;
  /** The backend's update verb for this resource. Confirmed per-controller —
   *  Users uses PUT, Employees and Organization use PATCH. Default: PATCH. */
  updateMethod?: "PUT" | "PATCH";
};

function toQueryString(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return "";
  return `?${new URLSearchParams(params).toString()}`;
}

/**
 * Build a CRUD client for a REST resource. Missing endpoints (404) resolve
 * to `unavailable: true` so the UI can render "Coming soon" without crashing.
 */
export function resourceApi<T extends ResourceRecord = ResourceRecord>(
  basePath: string,
  opts: ResourceApiOptions = {},
) {
  const { extraQuery, extraBody, updateMethod = "PATCH" } = opts;
  const qs = toQueryString(extraQuery);

  const normalize = (data: unknown): { items: T[]; total: number } => {
    if (Array.isArray(data)) return { items: data as T[], total: data.length };
    if (data && typeof data === "object") {
      const d = data as { content?: T[]; items?: T[]; totalElements?: number; total?: number };
      const items = d.content ?? d.items ?? [];
      const total =
        typeof d.totalElements === "number"
          ? d.totalElements
          : typeof d.total === "number"
            ? d.total
            : items.length;
      return { items, total };
    }
    return { items: [], total: 0 };
  };

  return {
    async list(signal?: AbortSignal): Promise<ResourceListResult<T>> {
      try {
        const data = await request<unknown>(`${basePath}${qs}`, { signal });
        const { items, total } = normalize(data);
        return { items, total, unavailable: false };
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return { items: [], total: 0, unavailable: true };
        }
        throw err;
      }
    },
    async get(id: string | number): Promise<T> {
      return request<T>(`${basePath}/${id}`);
    },
    async create(payload: Partial<T>): Promise<T> {
      return request<T>(basePath, { method: "POST", body: { ...extraBody, ...payload } });
    },
    async update(id: string | number, payload: Partial<T>): Promise<T> {
      return request<T>(`${basePath}/${id}`, {
        method: updateMethod,
        body: { ...extraBody, ...payload },
      });
    },
    async remove(id: string | number): Promise<void> {
      await request<void>(`${basePath}/${id}`, { method: "DELETE" });
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export type DashboardSummary = {
  employees: number | null;
  users: number | null;
  departments: number | null;
  roles: number | null;
};

/**
 * Fetches consolidated dashboard counts.
 *
 * Consolidated endpoint: there is no `/api/v1/dashboard/summary` on the
 * current backend at all (the old Sprint-8.1.1 dashboard controller was
 * removed in the mid-2026 architecture reset and never rebuilt) — the call
 * below always 404s today and exists so the dashboard picks it up for free
 * if/when the backend ships it.
 *
 * Fallback: per-resource counts. `/employees` requires a `tenantId` query
 * param (see DEFAULT_TENANT_ID note); `/departments` and `/roles` have no
 * backend endpoint at all (Company/Organization concepts, not implemented as
 * standalone list resources) and will always resolve to `null` — the UI
 * renders "—" for those cards without blocking the rest.
 *
 * Never throws: the dashboard must never be blocked by unimplemented endpoints.
 */
export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    // 1) Consolidated endpoint (preferred, currently unimplemented — see above).
    try {
      const data = await request<Partial<DashboardSummary>>("/dashboard/summary");
      return {
        employees: numOrNull(data.employees),
        users: numOrNull(data.users),
        departments: numOrNull(data.departments),
        roles: numOrNull(data.roles),
      };
    } catch {
      // Falls through to per-card fetches below regardless of error type.
    }

    // 2) Fallback to per-resource counts. Each call is independent; a failure
    //    on one card leaves it as null (renders "—") without affecting others.
    const [employees, users, departments, roles] = await Promise.all([
      safeCount(`/employees?tenantId=${DEFAULT_TENANT_ID}`),
      safeCount("/users"),
      safeCount("/departments"),
      safeCount("/roles"),
    ]);
    return { employees, users, departments, roles };
  },
};

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function safeCount(path: string): Promise<number | null> {
  try {
    const data = await request<
      unknown[] | { totalElements?: number; count?: number; content?: unknown[] }
    >(path);
    if (Array.isArray(data)) return data.length;
    if (data && typeof (data as { totalElements?: number }).totalElements === "number") {
      return (data as { totalElements: number }).totalElements;
    }
    if (data && typeof (data as { count?: number }).count === "number") {
      return (data as { count: number }).count;
    }
    if (data && Array.isArray((data as { content?: unknown[] }).content)) {
      return (data as { content: unknown[] }).content.length;
    }
    return null;
  } catch {
    return null;
  }
}

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
