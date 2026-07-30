/**
 * EWOS API client — SINGLE SOURCE OF TRUTH for backend communication.
 *
 * Contracts derived from the EWOS Spring Boot backend (buntychavan-web/EWOS,
 * branch `main`, 101 @RestControllers / 604 endpoints).
 *
 *  - Every endpoint is mounted under `/api/v1`.
 *  - Tenant-scoped endpoints require the `X-Tenant-Id` header; it is injected
 *    automatically from the authenticated session (MeResponse.tenantId).
 *  - Authentication is `Authorization: Bearer <accessToken>` (TokenResponse).
 *  - Collections are Spring `Page` objects: { content, totalElements, number,
 *    size, totalPages } — or plain arrays on non-paged endpoints.
 *  - Errors are `ApiError` { status, code, message, fieldErrors[] }.
 */

export const API_BASE = "/api/v1";

const TOKEN_KEY = "ewos.accessToken";
const REFRESH_KEY = "ewos.refreshToken";
const USER_KEY = "ewos.user";

/* -------------------------------------------------------------------------- */
/* Backend DTOs                                                               */
/* -------------------------------------------------------------------------- */

export type RoleSummary = { id?: string; name: string; permissions?: string[] };

/** GET /auth/me */
export type MeResponse = {
  userId: string;
  username: string;
  email?: string;
  roles?: RoleSummary[];
  tenantId?: string;
  employeeId?: string;
};

/** POST /auth/login | /auth/refresh */
export type TokenResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED" | "PRE_HIRE";

export type EmployeeResponse = {
  id: string;
  tenantId?: string;
  companyId?: string;
  userId?: string;
  employeeNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  dateOfBirth?: string;
  genderCode?: string;
  primaryOrgUnitId?: string;
  primaryOrgUnitCode?: string;
  managerEmployeeId?: string;
  employmentTypeId?: string;
  employmentTypeCode?: string;
  hireDate?: string;
  terminationDate?: string;
  status?: EmployeeStatus;
  versionNo?: number;
};

export type OrganizationUnitResponse = {
  id: string;
  companyId?: string;
  unitTypeId?: string;
  unitTypeCode?: string;
  parentId?: string;
  code: string;
  name: string;
  description?: string;
  countryCode?: string;
  costCenterCode?: string;
  status?: "ACTIVE" | "INACTIVE";
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type OrganizationUnitTypeResponse = {
  id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
};

export type UserResponse = {
  id: string;
  username: string;
  email?: string;
  enabled?: boolean;
  accountNonLocked?: boolean;
  roles?: RoleSummary[];
  lastLoginAt?: string;
};

export type PermissionResponse = { id: string; code: string; description?: string };

export type RoleResponse = {
  id: string;
  name: string;
  description?: string;
  systemRole?: boolean;
  permissions?: PermissionResponse[];
};

export type NotificationResponse = {
  id: string;
  type?: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: string | null;
  createdAt?: string;
};

export type LeaveRequestStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";

export type LeaveRequestResponse = {
  id: string;
  employeeId?: string;
  /** Present on approver-facing payloads so queues can show a name. */
  employeeName?: string;

  leaveTypeId?: string;
  leaveTypeCode?: string;
  startDate: string;
  endDate: string;
  daysRequested?: number;
  reason?: string;
  status?: LeaveRequestStatus;
  submittedAt?: string;
  rejectionReason?: string;
};

export type LeaveTypeResponse = {
  id: string;
  code: string;
  name?: string;
  paid?: boolean;
};

export type LeaveBalanceResponse = {
  leaveTypeId?: string;
  leaveTypeCode?: string;
  entitledDays?: number;
  usedDays?: number;
  pendingDays?: number;
  availableDays?: number;
  [k: string]: unknown;
};

export type TimeEntryResponse = {
  id: string;
  employeeId?: string;
  eventType?: string;
  occurredAt?: string;
  source?: string;
  location?: string;
  notes?: string;
};

export type TimesheetStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";

export type TimesheetResponse = {
  id: string;
  employeeId?: string;
  periodStart: string;
  periodEnd: string;
  workedHours?: number;
  overtimeHours?: number;
  breakHours?: number;
  absenceHours?: number;
  status?: TimesheetStatus;
  submittedAt?: string;
  rejectionReason?: string;
};

export type PayslipLineResponse = {
  id?: string;
  componentCode?: string;
  componentName?: string;
  amount?: number;
  type?: string;
};

export type PayslipResponse = {
  id: string;
  payrollRunId?: string;
  payrollPeriodId?: string;
  employeeId?: string;
  employeeNumber?: string;
  employeeName?: string;
  periodStart?: string;
  periodEnd?: string;
  payDate?: string;
  currency?: string;
  grossAmount?: number;
  deductionsAmount?: number;
  netAmount?: number;
  lopDays?: number;
  status?: string;
  lines?: PayslipLineResponse[];
};

export type PayrollPeriodResponse = {
  id: string;
  companyId?: string;
  code?: string;
  periodStart?: string;
  periodEnd?: string;
  payDate?: string;
  status?: string;
};

export type PayrollRunResponse = {
  id: string;
  payrollPeriodId?: string;
  runType?: string;
  status?: string;
  employeeCount?: number;
  grossAmount?: number;
  netAmount?: number;
  startedAt?: string;
  finalizedAt?: string;
};

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors: FieldError[];
  payload: unknown;

  constructor(message: string, status: number, payload: unknown, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.fieldErrors = fieldErrors;
    const code = (payload as { code?: string } | null)?.code;
    if (typeof code === "string") this.code = code;
  }

  /** Backend has not implemented / route not found. */
  get isNotFound() {
    return this.status === 404;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isValidation() {
    return this.status === 400 || this.status === 422;
  }
  get isOffline() {
    return this.status === 0;
  }
}

/* -------------------------------------------------------------------------- */
/* Session storage                                                            */
/* -------------------------------------------------------------------------- */

function pickStore(remember: boolean) {
  return remember ? localStorage : sessionStorage;
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
  },
  set(token: string, refresh?: string, remember = true) {
    const store = pickStore(remember);
    store.setItem(TOKEN_KEY, token);
    if (refresh) store.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem(TOKEN_KEY);
      s.removeItem(REFRESH_KEY);
      s.removeItem(USER_KEY);
    }
  },
};

export const sessionStore = {
  get(): MeResponse | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MeResponse;
    } catch {
      return null;
    }
  },
  set(me: MeResponse, remember = true) {
    pickStore(remember).setItem(USER_KEY, JSON.stringify(me));
  },
};

/** Invoked when the backend rejects the session (401). Wired by AuthProvider. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

/* -------------------------------------------------------------------------- */
/* Core request                                                               */
/* -------------------------------------------------------------------------- */

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: QueryParams;
  auth?: boolean;
  /** Skip the automatic 401 -> sign-out handler (used by the login screen). */
  skipAuthRedirect?: boolean;
  signal?: AbortSignal;
  accept?: string;
};

export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    params,
    auth = true,
    skipAuthRedirect = false,
    signal,
    accept = "application/json",
  } = opts;

  const headers: Record<string, string> = { Accept: accept };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    const tenantId = sessionStore.get()?.tenantId;
    if (tenantId) headers["X-Tenant-Id"] = tenantId;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(
      "Unable to reach the EWOS server. Check your connection and try again.",
      0,
      err,
    );
  }

  if (response.status === 204) return undefined as T;

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
    if (response.status === 401 && !skipAuthRedirect) onUnauthorized?.();
    throw new ApiError(
      extractErrorMessage(data, response.status),
      response.status,
      data,
      extractFieldErrors(data),
    );
  }

  return data as T;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const key of ["message", "detail", "error", "error_description"]) {
      const v = d[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    if (Array.isArray(d.errors) && d.errors.length) {
      return d.errors
        .map((e) => (typeof e === "string" ? e : ((e as FieldError).message ?? JSON.stringify(e))))
        .join(", ");
    }
  }
  if (typeof data === "string" && data.trim()) return data;
  if (status === 0) return "Network error. Could not reach the server.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "This change conflicts with the current record. Reload and retry.";
  if (status >= 500) return "The server encountered an error. Please try again shortly.";
  return `Request failed (${status}).`;
}

function extractFieldErrors(data: unknown): FieldError[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const raw = (d.fieldErrors ?? d.errors ?? d.violations) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      field: String(e.field ?? e.property ?? e.path ?? ""),
      message: String(e.message ?? e.defaultMessage ?? ""),
    }))
    .filter((e) => e.field && e.message);
}

/* -------------------------------------------------------------------------- */
/* Spring Page normalisation                                                  */
/* -------------------------------------------------------------------------- */

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export function toPage<T>(data: unknown, fallbackSize = 20): Page<T> {
  if (Array.isArray(data)) {
    return {
      content: data as T[],
      totalElements: data.length,
      totalPages: 1,
      number: 0,
      size: data.length || fallbackSize,
    };
  }
  if (data && typeof data === "object") {
    const d = data as Partial<Page<T>> & { items?: T[] };
    const content = d.content ?? d.items ?? [];
    return {
      content,
      totalElements: d.totalElements ?? content.length,
      totalPages: d.totalPages ?? 1,
      number: d.number ?? 0,
      size: d.size ?? fallbackSize,
    };
  }
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size: fallbackSize };
}

export const emptyPage = <T>(): Page<T> => ({
  content: [] as T[],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
});

export type PageQuery = { page?: number; size?: number; sort?: string };

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export const authApi = {
  login(payload: { username: string; password: string }) {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
      skipAuthRedirect: true,
    });
  },
  refresh(refreshToken: string) {
    return request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
      skipAuthRedirect: true,
    });
  },
  me() {
    return request<MeResponse>("/auth/me", { skipAuthRedirect: true });
  },
  async logout() {
    try {
      await request<void>("/auth/logout", { method: "POST", skipAuthRedirect: true });
    } catch {
      // Local token clear is authoritative even if the call fails.
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Generic paged REST resource                                                */
/* -------------------------------------------------------------------------- */

export type ResourceRecord = Record<string, unknown> & { id?: string | number };

export function resourceApi<T extends ResourceRecord = ResourceRecord>(basePath: string) {
  return {
    async list(query: PageQuery & QueryParams = {}, signal?: AbortSignal): Promise<Page<T>> {
      const data = await request<unknown>(basePath, { params: query, signal });
      return toPage<T>(data, query.size ?? 20);
    },
    get(id: string | number, signal?: AbortSignal) {
      return request<T>(`${basePath}/${id}`, { signal });
    },
    create(payload: Partial<T>) {
      return request<T>(basePath, { method: "POST", body: payload });
    },
    update(id: string | number, payload: Partial<T>, method: "PUT" | "PATCH" = "PATCH") {
      return request<T>(`${basePath}/${id}`, { method, body: payload });
    },
    remove(id: string | number) {
      return request<void>(`${basePath}/${id}`, { method: "DELETE" });
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Module APIs                                                                */
/* -------------------------------------------------------------------------- */

export const employeesApi = {
  ...resourceApi<EmployeeResponse & ResourceRecord>("/employees"),
  search(query: PageQuery & QueryParams, signal?: AbortSignal) {
    return request<unknown>("/employees", { params: query, signal }).then((d) =>
      toPage<EmployeeResponse>(d, query.size ?? 20),
    );
  },
  me(signal?: AbortSignal) {
    return request<EmployeeResponse>("/employees/me", { signal });
  },
  myReports(signal?: AbortSignal) {
    return request<EmployeeResponse[]>("/employees/me/reports", { signal });
  },
  employmentTypes(signal?: AbortSignal) {
    return request<unknown>("/employees/employment-types", { signal }).then(
      (d) => toPage<ResourceRecord>(d).content,
    );
  },
  identityHistory(id: string, signal?: AbortSignal) {
    return request<ResourceRecord[]>(`/employees/${id}/identity-history`, { signal });
  },
  changeStatus(id: string, target: EmployeeStatus) {
    return request<EmployeeResponse>(`/employees/${id}/status`, {
      method: "POST",
      params: { target },
    });
  },
  terminate(id: string, body: { terminationDate: string; reason?: string }) {
    return request<EmployeeResponse>(`/employees/${id}/terminate`, { method: "POST", body });
  },
};

export const organizationApi = {
  units: resourceApi<OrganizationUnitResponse & ResourceRecord>("/organization/units"),
  unitTypes: resourceApi<OrganizationUnitTypeResponse & ResourceRecord>("/organization/unit-types"),
  tree(signal?: AbortSignal) {
    return request<OrganizationUnitResponse[]>("/organization/units/tree", { signal });
  },
  setUnitStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    return request<OrganizationUnitResponse>(`/organization/units/${id}/status`, {
      method: "POST",
      params: { target: status },
    });
  },
};

export const companiesApi = resourceApi<ResourceRecord>("/companies");

export const usersApi = {
  ...resourceApi<UserResponse & ResourceRecord>("/users"),
  setStatus(id: string, enabled: boolean) {
    return request<UserResponse>(`/users/${id}/status`, { method: "POST", params: { enabled } });
  },
  resetPassword(id: string) {
    return request<unknown>(`/users/${id}/reset-password`, { method: "POST" });
  },
  changeMyPassword(body: { currentPassword: string; newPassword: string }) {
    return request<void>("/users/me/change-password", { method: "POST", body });
  },
};

export const rolesApi = {
  ...resourceApi<RoleResponse & ResourceRecord>("/roles"),
  assignedUsers(id: string, signal?: AbortSignal) {
    return request<UserResponse[]>(`/roles/${id}/users`, { signal });
  },
  impact(id: string, signal?: AbortSignal) {
    return request<ResourceRecord>(`/roles/${id}/impact`, { signal });
  },
};

export const permissionsApi = {
  list(signal?: AbortSignal) {
    return request<unknown>("/permissions", { signal }).then(
      (d) => toPage<PermissionResponse>(d).content,
    );
  },
};

export const notificationsApi = {
  mine(query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>("/notifications/mine", { params: query, signal }).then((d) =>
      toPage<NotificationResponse>(d, query.size ?? 20),
    );
  },
  unreadCount(signal?: AbortSignal) {
    return request<{ count?: number } | number>("/notifications/mine/unread-count", {
      signal,
    }).then((d) => (typeof d === "number" ? d : (d?.count ?? 0)));
  },
  markRead(id: string) {
    return request<void>(`/notifications/${id}/read`, { method: "POST" });
  },
};

export const leaveApi = {
  myBalances(signal?: AbortSignal) {
    return request<LeaveBalanceResponse[]>("/leave/self-service/balances", { signal });
  },
  leaveTypes(signal?: AbortSignal) {
    return request<LeaveTypeResponse[]>("/leave/self-service/leave-types", { signal });
  },
  myRequests(query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>("/leave/self-service/requests", { params: query, signal }).then((d) =>
      toPage<LeaveRequestResponse>(d, query.size ?? 20),
    );
  },
  createRequest(body: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    return request<LeaveRequestResponse>("/leave/self-service/requests", {
      method: "POST",
      body,
    });
  },
  submitRequest(id: string) {
    return request<LeaveRequestResponse>(`/leave/self-service/requests/${id}/submit`, {
      method: "POST",
    });
  },
  cancelRequest(id: string) {
    return request<LeaveRequestResponse>(`/leave/self-service/requests/${id}/cancel`, {
      method: "POST",
    });
  },
  /** MSS — requests awaiting the signed-in approver. */
  pendingApprovals(signal?: AbortSignal) {
    return request<unknown>("/leave/self-service/reports/pending", { signal }).then(
      (d) => toPage<LeaveRequestResponse>(d).content,
    );
  },
  approve(id: string, body?: { comment?: string }) {
    return request<LeaveRequestResponse>(`/leave/requests/${id}/approve`, {
      method: "POST",
      body: body ?? {},
    });
  },
  reject(id: string, body: { rejectionReason: string }) {
    return request<LeaveRequestResponse>(`/leave/requests/${id}/reject`, {
      method: "POST",
      body,
    });
  },
  types: resourceApi<ResourceRecord>("/leave/types"),
  employeeBalances(employeeId: string, signal?: AbortSignal) {
    return request<LeaveBalanceResponse[]>(`/leave/balances/employee/${employeeId}`, { signal });
  },
};

export const attendanceApi = {
  myTimeEntries(query: PageQuery & QueryParams = {}, signal?: AbortSignal) {
    return request<unknown>("/attendance/self-service/time-entries", {
      params: query,
      signal,
    }).then((d) => toPage<TimeEntryResponse>(d, query.size ?? 50));
  },
  punch(body: { eventType: string; occurredAt?: string; location?: string; notes?: string }) {
    return request<TimeEntryResponse>("/attendance/self-service/time-entries", {
      method: "POST",
      body,
    });
  },
  myTimesheets(query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>("/attendance/self-service/timesheets", {
      params: query,
      signal,
    }).then((d) => toPage<TimesheetResponse>(d, query.size ?? 20));
  },
  employeeTimesheets(employeeId: string, query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>(`/attendance/timesheets/employee/${employeeId}`, {
      params: query,
      signal,
    }).then((d) => toPage<TimesheetResponse>(d, query.size ?? 20));
  },
  employeeTimeEntries(employeeId: string, query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>(`/attendance/time-entries/employee/${employeeId}`, {
      params: query,
      signal,
    }).then((d) => toPage<TimeEntryResponse>(d, query.size ?? 50));
  },
  submitTimesheet(id: string) {
    return request<TimesheetResponse>(`/attendance/timesheets/${id}/submit`, { method: "POST" });
  },
  approveTimesheet(id: string) {
    return request<TimesheetResponse>(`/attendance/timesheets/${id}/approve`, { method: "POST" });
  },
  rejectTimesheet(id: string, body: { rejectionReason: string }) {
    return request<TimesheetResponse>(`/attendance/timesheets/${id}/reject`, {
      method: "POST",
      body,
    });
  },
  recomputeTimesheet(id: string) {
    return request<TimesheetResponse>(`/attendance/timesheets/${id}/recompute`, {
      method: "POST",
    });
  },
  policies: resourceApi<ResourceRecord>("/attendance/policies"),
};

export const payrollApi = {
  myPayslips(query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>("/payroll/self-service/payslips", { params: query, signal }).then((d) =>
      toPage<PayslipResponse>(d, query.size ?? 20),
    );
  },
  payslip(id: string, signal?: AbortSignal) {
    return request<PayslipResponse>(`/payroll/payslips/${id}`, { signal });
  },
  payslipsForRun(runId: string, query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>(`/payroll/payslips/run/${runId}`, { params: query, signal }).then((d) =>
      toPage<PayslipResponse>(d, query.size ?? 20),
    );
  },
  periods(query: PageQuery & QueryParams = {}, signal?: AbortSignal) {
    return request<unknown>("/payroll/periods", { params: query, signal }).then((d) =>
      toPage<PayrollPeriodResponse>(d, query.size ?? 20),
    );
  },
  closePeriod(id: string) {
    return request<PayrollPeriodResponse>(`/payroll/periods/${id}/close`, { method: "POST" });
  },
  lockPeriod(id: string) {
    return request<PayrollPeriodResponse>(`/payroll/periods/${id}/lock`, { method: "POST" });
  },
  runs(query: PageQuery & QueryParams = {}, signal?: AbortSignal) {
    return request<unknown>("/payroll/runs", { params: query, signal }).then((d) =>
      toPage<PayrollRunResponse>(d, query.size ?? 20),
    );
  },
  run(id: string, signal?: AbortSignal) {
    return request<PayrollRunResponse>(`/payroll/runs/${id}`, { signal });
  },
  createRun(body: { payrollPeriodId: string; paygroupId?: string }) {
    return request<PayrollRunResponse>("/payroll/runs", { method: "POST", body });
  },
  freezeRun(id: string) {
    return request<PayrollRunResponse>(`/payroll/runs/${id}/freeze`, { method: "POST" });
  },
  finalizeRun(id: string) {
    return request<PayrollRunResponse>(`/payroll/runs/${id}/finalize`, { method: "POST" });
  },
  dashboard(signal?: AbortSignal) {
    return request<Record<string, unknown>>("/payroll/reports/dashboard", { signal });
  },
  salaryRegister(query: QueryParams, signal?: AbortSignal) {
    return request<unknown>("/payroll/reports/salary-register", { params: query, signal });
  },
  salaryRegisterCsvUrl(query: QueryParams) {
    return `${API_BASE}/payroll/reports/salary-register.csv${buildQuery(query)}`;
  },
  challans(query: PageQuery & QueryParams = {}, signal?: AbortSignal) {
    return request<unknown>("/payroll/challans", { params: query, signal }).then((d) =>
      toPage<ResourceRecord>(d, query.size ?? 20),
    );
  },
  settlements(query: PageQuery & QueryParams = {}, signal?: AbortSignal) {
    return request<unknown>("/payroll/settlements", { params: query, signal }).then((d) =>
      toPage<ResourceRecord>(d, query.size ?? 20),
    );
  },
  components: resourceApi<ResourceRecord>("/payroll/components"),
  bankAccountsForEmployee(employeeId: string, signal?: AbortSignal) {
    return request<ResourceRecord[]>(`/payroll/bank-accounts/employee/${employeeId}`, { signal });
  },
  compensationsForEmployee(employeeId: string, signal?: AbortSignal) {
    return request<unknown>(`/payroll/compensations/employee/${employeeId}`, { signal }).then(
      (d) => toPage<ResourceRecord>(d).content,
    );
  },
  payslipsForEmployee(employeeId: string, query: PageQuery = {}, signal?: AbortSignal) {
    return request<unknown>(`/payroll/payslips/employee/${employeeId}`, {
      params: query,
      signal,
    }).then((d) => toPage<PayslipResponse>(d, query.size ?? 20));
  },
};

/* -------------------------------------------------------------------------- */
/* Dashboard KPI counts                                                       */
/* -------------------------------------------------------------------------- */

export type DashboardSummary = {
  employees: number | null;
  users: number | null;
  departments: number | null;
  roles: number | null;
};

/** Reads `totalElements` from each collection; null when the call fails. */
async function countOf(path: string, params: QueryParams = {}): Promise<number | null> {
  try {
    const data = await request<unknown>(path, { params: { page: 0, size: 1, ...params } });
    return toPage<unknown>(data).totalElements;
  } catch {
    return null;
  }
}

export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    const [employees, users, departments, roles] = await Promise.all([
      countOf("/employees"),
      countOf("/users"),
      countOf("/organization/units", { unitTypeCode: "DEPARTMENT" }),
      countOf("/roles"),
    ]);
    return { employees, users, departments, roles };
  },
};

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

export function displayName(me: MeResponse | null | undefined): string {
  if (!me) return "";
  return me.username || me.email || "User";
}

export function employeeName(e: Partial<EmployeeResponse> | null | undefined): string {
  if (!e) return "";
  if (e.displayName) return e.displayName;
  const parts = [e.firstName, e.middleName, e.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : (e.employeeNumber ?? "");
}

export function initials(input: MeResponse | string | null | undefined): string {
  const name = typeof input === "string" ? input : displayName(input);
  if (!name) return "?";
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
