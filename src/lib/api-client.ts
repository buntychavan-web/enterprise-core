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
 *  TENANT ID — Sprint 2.1 update
 * ─────────────────────────────────────────────────────────────────────────
 *  `GET /api/v1/auth/me` (com.ewos.identity.api.dto.MeResponse) returns the
 *  caller's real `tenantId`. Sprint 2.1 wires this through `tenantStore` and
 *  the `X-Tenant-Id` request header — see TenantProvider in tenant-context.tsx
 *  for the per-request active tenant/company. `DEFAULT_TENANT_ID` /
 *  `DEFAULT_COMPANY_ID` remain exported as a fallback for the handful of
 *  screens outside Sprint 2's scope (ESS/MSS/payroll-provider) that still
 *  reference them directly; do not add new usages — consume `useTenant()`
 *  instead.
 * ─────────────────────────────────────────────────────────────────────────
 *  CONTRACT ASSUMPTIONS (adjust to match your OpenAPI spec)
 * ─────────────────────────────────────────────────────────────────────────
 *  POST /api/v1/auth/login
 *      request : { username: string, password: string }
 *      200     : { accessToken: string, refreshToken?: string, user?: UserDto }
 *      4xx/5xx : { message?: string, error?: string, errors?: string[] }
 *
 *  POST /api/v1/auth/logout        (optional; called if it exists)
 *  GET  /api/v1/auth/me            → MeResponse { userId, username, email,
 *                                    roles: {name}[], tenantId, employeeId }
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
const TENANT_KEY = "ewos.tenantId";

/** Fallback only — see "TENANT ID — Sprint 2.1 update" note above. */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export type RoleSummary = { name: string; [k: string]: unknown };

export type UserDto = {
  userId?: string;
  id?: string | number;
  username?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: Array<string | RoleSummary>;
  tenantId?: string;
  employeeId?: string;
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
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
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
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

/** Active tenant for the `X-Tenant-Id` header, sourced from MeResponse.tenantId. */
export const tenantStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TENANT_KEY) ?? sessionStorage.getItem(TENANT_KEY);
  },
  set(tenantId: string, remember = true) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TENANT_KEY, tenantId);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TENANT_KEY);
    sessionStorage.removeItem(TENANT_KEY);
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
  /** Extra headers layered on top of the defaults below (e.g. Idempotency-Key). */
  headers?: Record<string, string>;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = opts;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...opts.headers,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    // Every tenant-scoped backend controller requires this header. Sourced
    // from MeResponse.tenantId (see tenantStore) once the caller has signed
    // in; falls back to the bootstrap tenant only if that hasn't happened yet
    // (e.g. a request fired before /auth/me resolves).
    headers["X-Tenant-Id"] = tenantStore.get() ?? DEFAULT_TENANT_ID;
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
    if (response.status === 401 && auth) {
      // The access token expired or was revoked mid-session — every other
      // authenticated request would fail the same way, so clear it and send
      // the user back to login instead of leaving a stuck, half-working UI.
      // A hard redirect (not router navigation) guarantees all React state
      // resets, since this module has no access to the router instance.
      handleSessionExpired();
    }
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function handleSessionExpired() {
  tokenStore.clear();
  tenantStore.clear();
  userStore.clear();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
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

  /** GET /auth/me → MeResponse. Returns null if unreachable (e.g. demo mode, or not yet signed in). */
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

  /** Sprint 2.3 — inline enable/disable toggle, bypassing the edit dialog. */
  async setStatus(id: string | number, enabled: boolean): Promise<UserDto> {
    return request<UserDto>(`/users/${id}/status`, { method: "PATCH", body: { enabled } });
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
/* Integration Adapter Framework + Monitoring + Operations Dashboard          */
/* + Client Go-Live Configuration (Sprint 14.4)                              */
/* -------------------------------------------------------------------------- */

export type IntegrationAdapterType = "REST" | "SFTP" | "CSV" | "EXCEL" | "FILE_UPLOAD";

export type ErrorClassification =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "TRANSIENT_NETWORK"
  | "DATA_MAPPING"
  | "EXTERNAL_SYSTEM"
  | "CONFIGURATION"
  | "UNKNOWN";

export type IntegrationExecutionOutcome = "SUCCESS" | "FAILURE";

export type IntegrationConfigurationDto = {
  id: string;
  tenantId: string;
  companyId: string;
  exchangeType: string;
  adapterType: IntegrationAdapterType;
  configJson: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationExecutionDto = {
  id: string;
  tenantId: string;
  companyId: string;
  dataExchangeRecordId: string;
  configurationId?: string;
  adapterType?: IntegrationAdapterType;
  attemptNumber: number;
  outcome: IntegrationExecutionOutcome;
  errorClassification?: ErrorClassification;
  errorMessage?: string;
  startedAt: string;
  completedAt: string;
  durationMs?: number;
};

export const integrationConfigurationApi = {
  async forCompany(companyId: string): Promise<IntegrationConfigurationDto[]> {
    return request<IntegrationConfigurationDto[]>(
      `/integration/configurations?companyId=${companyId}`,
    );
  },
  async create(payload: {
    tenantId: string;
    companyId: string;
    exchangeType: string;
    adapterType: IntegrationAdapterType;
    configJson: string;
  }): Promise<IntegrationConfigurationDto> {
    return request<IntegrationConfigurationDto>("/integration/configurations", {
      method: "POST",
      body: payload,
    });
  },
  async update(
    id: string,
    payload: { configJson?: string; active?: boolean },
  ): Promise<IntegrationConfigurationDto> {
    return request<IntegrationConfigurationDto>(`/integration/configurations/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/integration/configurations/${id}`, { method: "DELETE" });
  },
};

export const integrationExecutionApi = {
  async process(dataExchangeRecordId: string): Promise<IntegrationExecutionDto> {
    return request<IntegrationExecutionDto>(
      `/integration/executions/process/${dataExchangeRecordId}`,
      { method: "POST" },
    );
  },
  async historyOf(dataExchangeRecordId: string): Promise<IntegrationExecutionDto[]> {
    return request<IntegrationExecutionDto[]>(
      `/integration/executions/of-record/${dataExchangeRecordId}`,
    );
  },
};

export type IntegrationMonitoringSummary = {
  companyId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  byAdapterType: Partial<Record<IntegrationAdapterType, number>>;
  byErrorClassification: Partial<Record<ErrorClassification, number>>;
  recentFailures: IntegrationExecutionDto[];
};

export const integrationMonitoringApi = {
  /** Returns null when the endpoint isn't available yet (404) instead of throwing. */
  async summary(companyId: string): Promise<IntegrationMonitoringSummary | null> {
    try {
      return await request<IntegrationMonitoringSummary>(
        `/integration/monitoring/summary?companyId=${companyId}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};

export type OperationsPipelineRow = {
  payrollRunId: string;
  companyId: string;
  payrollRunStatus: string;
  payrollRunCreatedAt: string;
  clientApprovalInstanceStatus?: "RUNNING" | "COMPLETED" | "CANCELLED" | "ERROR";
  clientApprovalStateCode?: string;
  dataExchangeRecordId?: string;
  dataExchangeStatus?: DataExchangeStatus;
  lastIntegrationOutcome?: IntegrationExecutionOutcome;
  acknowledged: boolean;
};

export type OperationsDashboardData = {
  companyId: string;
  rows: OperationsPipelineRow[];
};

export const operationsDashboardApi = {
  /** Returns null when the endpoint isn't available yet (404) instead of throwing. */
  async forCompany(companyId: string): Promise<OperationsDashboardData | null> {
    try {
      return await request<OperationsDashboardData>(
        `/integration/operations-dashboard?companyId=${companyId}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};

export type ClientGoLiveStatus = "PLANNING" | "READY" | "LIVE" | "SUSPENDED";

export type ClientGoLiveConfigurationDto = {
  id: string;
  tenantId: string;
  clientId: string;
  companyId: string;
  goLiveDate?: string;
  status: ClientGoLiveStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const clientGoLiveApi = {
  /** Returns null when there's no go-live configuration yet for this company (404). */
  async forCompany(companyId: string): Promise<ClientGoLiveConfigurationDto | null> {
    try {
      return await request<ClientGoLiveConfigurationDto>(
        `/integration/golive/by-company?companyId=${companyId}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
  async create(payload: {
    tenantId: string;
    clientId: string;
    companyId: string;
    goLiveDate?: string;
    notes?: string;
  }): Promise<ClientGoLiveConfigurationDto> {
    return request<ClientGoLiveConfigurationDto>("/integration/golive", {
      method: "POST",
      body: payload,
    });
  },
  async update(
    id: string,
    payload: { goLiveDate?: string; status?: ClientGoLiveStatus; notes?: string },
  ): Promise<ClientGoLiveConfigurationDto> {
    return request<ClientGoLiveConfigurationDto>(`/integration/golive/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Roles / Permissions catalog (Sprint 2.3) — thin read-only fetchers backing */
/* RoleMultiSelect and PermissionPicker; the Roles CRUD screen itself still   */
/* goes through resourceApi("/roles") like any other CrudScreen resource.    */
/* -------------------------------------------------------------------------- */

export type PermissionDto = { id: string; code: string; description?: string };
export type RoleDto = {
  id: string;
  tenantId?: string;
  systemRole: boolean;
  name: string;
  description?: string;
  permissions?: PermissionDto[];
};

export const rolesApi = {
  async list(): Promise<RoleDto[]> {
    return request<RoleDto[]>("/roles");
  },
};

export const permissionsApi = {
  async list(): Promise<PermissionDto[]> {
    return request<PermissionDto[]>("/permissions");
  },
};

export type RoleImpactResponse = {
  roleId: string;
  roleName: string;
  systemRole: boolean;
  assignedUserCount: number;
  companies: { companyId: string; userCount: number }[];
  departments: { orgUnitId: string; orgUnitCode: string; userCount: number }[];
  pendingWorkflowTaskCount: number;
  canDelete: boolean;
};

export const roleImpactApi = {
  async of(roleId: string): Promise<RoleImpactResponse> {
    return request<RoleImpactResponse>(`/roles/${roleId}/impact`);
  },
};

/* -------------------------------------------------------------------------- */
/* Employee Identity link/unlink/provision (Sprint 2.4) — admin-only actions */
/* over an employee's linked platform login (Sprint 1.3 backend).            */
/* -------------------------------------------------------------------------- */

export const employeeIdentityApi = {
  async link(
    employeeId: string | number,
    payload: { userId: string; reason?: string },
  ): Promise<ResourceRecord> {
    return request<ResourceRecord>(`/employees/${employeeId}/link-user`, {
      method: "POST",
      body: payload,
    });
  },
  async unlink(employeeId: string | number, payload: { reason?: string }): Promise<ResourceRecord> {
    return request<ResourceRecord>(`/employees/${employeeId}/unlink-user`, {
      method: "POST",
      body: payload,
    });
  },
  async provisionUser(
    employeeId: string | number,
    payload: {
      username: string;
      email: string;
      password: string;
      roleIds?: string[];
      enabled?: boolean;
      reason?: string;
    },
  ): Promise<ResourceRecord> {
    return request<ResourceRecord>(`/employees/${employeeId}/provision-user`, {
      method: "POST",
      body: payload,
    });
  },
};

export type EmployeeIdentityHistoryEntry = {
  id: string;
  action: "LINK" | "UNLINK" | "PROVISION";
  previousUserId?: string;
  newUserId?: string;
  reason?: string;
  actorId?: string;
  occurredAt: string;
};

export const employeeIdentityHistoryApi = {
  async of(employeeId: string | number): Promise<EmployeeIdentityHistoryEntry[]> {
    return request<EmployeeIdentityHistoryEntry[]>(`/employees/${employeeId}/identity-history`);
  },
};

/**
 * Self-service "my own employee record" (Sprint 2.4, §8.4). A 404 means no
 * employee is linked; a 409 means the caller's login is linked in more than
 * one company and must retry with ?companyId= — the backend's message lists
 * the candidate company IDs as a comma-separated string (not structured
 * JSON), per EmployeeService.getMe(); parsed client-side, matching the
 * Sprint 1.3 SDD's own "minimal, not polished" framing of this edge case.
 */
export const employeeSelfApi = {
  async me(companyId?: string): Promise<ResourceRecord | { conflictCompanyIds: string[] } | null> {
    try {
      return await request<ResourceRecord>(
        companyId ? `/employees/me?companyId=${companyId}` : "/employees/me",
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      if (err instanceof ApiError && err.status === 409) {
        const ids = err.message.match(/[0-9a-f-]{36}/gi) ?? [];
        return { conflictCompanyIds: ids };
      }
      throw err;
    }
  },
};

/**
 * Sprint 1 (ESS Core Polish) — the real self-service profile update endpoint
 * (Sprint 27C `EssProfileController`), previously wired on the backend but
 * never called from this client (Profile's "Edit" button was a no-op).
 *
 * Only these 5 fields are settable — the backend explicitly excludes
 * workEmail/displayName (HR-admin-only) and every employment field
 * (employeeNumber, name, hireDate, status, manager, etc.) from this DTO, so
 * there is no point exposing them as "editable" in the UI. Every field is
 * optional; a field omitted (or sent as undefined) leaves the current value
 * unchanged server-side — see EmployeeService.updateMe's null-check pattern.
 */
export type EssProfileUpdateRequest = {
  personalEmail?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  avatarStorageUri?: string;
};

/** Mirrors the backend's ApiError.fieldErrors — present on 400s from @Valid failures. */
export type ApiFieldError = {
  field: string;
  rejectedValue?: unknown;
  message: string;
  code?: string;
};

/** Best-effort extraction of field-level validation errors from an ApiError's raw payload. */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const payload = err.payload;
  if (!payload || typeof payload !== "object" || !("fieldErrors" in payload)) return {};
  const raw = (payload as { fieldErrors: unknown }).fieldErrors;
  if (!Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const e of raw) {
    if (e && typeof e === "object" && "field" in e && "message" in e) {
      const fe = e as ApiFieldError;
      out[fe.field] = fe.message;
    }
  }
  return out;
}

export const essProfileApi = {
  /**
   * PATCH /self-service/me — requires an Idempotency-Key header (the backend
   * rejects a missing/blank one with 400, not treats it as optional) so a
   * retried request after a dropped response replays the original result
   * instead of double-applying. Returns the same full EmployeeResponse shape
   * as employeeSelfApi.me().
   */
  async updateMe(patch: EssProfileUpdateRequest): Promise<ResourceRecord> {
    return request<ResourceRecord>("/self-service/me", {
      method: "PATCH",
      body: patch,
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Employee & Manager Self-Service (Sprint 3) — reads/writes scoped to the   */
/* caller's own linked employee record via new backend /self-service         */
/* endpoints (com.ewos.leave/attendance/payroll), which require only         */
/* authentication, not an admin-tier permission — mirroring GET /employees/me */
/* (Sprint 1.3) exactly.                                                      */
/* -------------------------------------------------------------------------- */

export type LeaveTypeDto = {
  id: string;
  code: string;
  name: string;
  paid?: boolean;
  minNoticeDays?: number;
};

export type LeaveRequestDto = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeCode?: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledAt?: string;
};

export type LeaveBalanceDto = {
  id: string;
  leaveTypeId: string;
  leaveTypeCode?: string;
  year: number;
  accruedDays: number;
  consumedDays: number;
  pendingDays: number;
  adjustmentDays: number;
  carryForwardDays: number;
  availableDays: number;
};

/** Shape of a Spring Data `Page<T>` response, used by the paginated self-service endpoints. */
export type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export const leaveSelfServiceApi = {
  async leaveTypes(): Promise<LeaveTypeDto[]> {
    return request<LeaveTypeDto[]>("/leave/self-service/leave-types");
  },
  async myRequests(): Promise<LeaveRequestDto[]> {
    return request<LeaveRequestDto[]>("/leave/self-service/requests");
  },
  async createRequest(payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }): Promise<LeaveRequestDto> {
    return request<LeaveRequestDto>("/leave/self-service/requests", {
      method: "POST",
      body: payload,
    });
  },
  /** Sprint 4: the tenant's active leave-approval workflow is resolved server-side. */
  async submitRequest(id: string): Promise<LeaveRequestDto> {
    return request<LeaveRequestDto>(`/leave/self-service/requests/${id}/submit`, {
      method: "POST",
    });
  },
  async cancelRequest(id: string): Promise<LeaveRequestDto> {
    return request<LeaveRequestDto>(`/leave/self-service/requests/${id}/cancel`, {
      method: "POST",
    });
  },
  async myBalances(year?: number): Promise<LeaveBalanceDto[]> {
    return request<LeaveBalanceDto[]>(`/leave/self-service/balances${year ? `?year=${year}` : ""}`);
  },
  /**
   * Sprint 4 audit fix: replaces the tenant-wide `leaveApprovalsApi.pending()` +
   * client-side filter with a server-side manager-scoped, paginated query.
   */
  async pendingForMyReports(page = 0, size = 20): Promise<SpringPage<LeaveRequestDto>> {
    return request<SpringPage<LeaveRequestDto>>(
      `/leave/self-service/reports/pending?page=${page}&size=${size}`,
    );
  },
};

export type TimeEntryDto = {
  id: string;
  eventType: "IN" | "OUT" | "BREAK_START" | "BREAK_END";
  occurredAt: string;
  location?: string;
  notes?: string;
};

export type TimesheetDto = {
  id: string;
  periodStart: string;
  periodEnd: string;
  workedHours?: number;
  overtimeHours?: number;
  breakHours?: number;
  absenceHours?: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
};

export const attendanceSelfServiceApi = {
  async myRecentTimeEntries(): Promise<TimeEntryDto[]> {
    return request<TimeEntryDto[]>("/attendance/self-service/time-entries");
  },
  async myTimesheets(): Promise<TimesheetDto[]> {
    return request<TimesheetDto[]>("/attendance/self-service/timesheets");
  },
};

export type PayslipDto = {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  currency: string;
  grossAmount: number;
  deductionsAmount: number;
  netAmount: number;
  status: string;
};

export const payslipSelfServiceApi = {
  async myPayslips(): Promise<PayslipDto[]> {
    return request<PayslipDto[]>("/payroll/self-service/payslips");
  },
};

export const employeeReportsApi = {
  async myReports(): Promise<ResourceRecord[]> {
    return request<ResourceRecord[]>("/employees/me/reports");
  },
};

/* -------------------------------------------------------------------------- */
/* ESS Dashboard (Sprint 27C) — the caller's landing-page aggregate. Built    */
/* alongside the self-service/leave/attendance/payroll APIs above but never   */
/* consumed by the frontend until Sprint 0 (EWOS App Shell) wired it into the */
/* new Home/Today screen and Attention Inbox.                                 */
/* -------------------------------------------------------------------------- */

export type EssPendingActionsDto = {
  notificationsUnread: number;
  timesheetDue: boolean;
  leaveRequestsPendingMyApproval: number;
  upcomingTimesheetDeadline?: string;
};

export type EssLeaveSummaryDto = {
  balanceDays?: number;
  pendingRequests: number;
  nextApprovedLeaveDate?: string;
};

export type EssPayrollSnapshotDto = {
  latestPayslipId?: string;
  latestPayslipPeriodStart?: string;
  latestPayslipPeriodEnd?: string;
  ytdGross?: number;
  ytdTaxDeducted?: number;
};

export type CalendarEventDto = {
  date: string;
  type: "HOLIDAY" | "LEAVE" | "TIMESHEET_DUE";
  title: string;
  metadata?: Record<string, string>;
};

export type EssDashboardDto = {
  employee: ResourceRecord | null;
  pendingActions: EssPendingActionsDto;
  leaveSummary: EssLeaveSummaryDto;
  payrollSnapshot: EssPayrollSnapshotDto;
  upcomingEvents: CalendarEventDto[];
};

export const essDashboardApi = {
  async get(): Promise<EssDashboardDto> {
    return request<EssDashboardDto>("/self-service/dashboard");
  },
};

export const essCalendarApi = {
  /** `from`/`to` are ISO date strings (yyyy-MM-dd). */
  async upcoming(from: string, to: string): Promise<CalendarEventDto[]> {
    const data = await request<{ events: CalendarEventDto[] }>(
      `/self-service/calendar?from=${from}&to=${to}`,
    );
    return data.events;
  },
};

/* -------------------------------------------------------------------------- */
/* MSS Dashboard (Sprint 27C) — the caller's team summary. Same "built but    */
/* never consumed" situation as the ESS dashboard above.                      */
/* -------------------------------------------------------------------------- */

export type MssTeamSummaryDto = {
  headcount: number;
  onLeaveToday: number;
  pendingApprovals: number;
  timesheetsPending: number;
  leaveRequestsPending: number;
};

export type MssTeamAttendanceEntryDto = {
  employeeId: string;
  displayName: string;
  /** PRESENT is never actually emitted by the backend today (no live daily rollup exists —
   *  see MssAttendanceStatus's javadoc) — treat it as a reserved future value, not live data. */
  status: "PRESENT" | "ON_LEAVE" | "NOT_MARKED";
};

export type MssUpcomingLeaveEntryDto = {
  employeeId: string;
  displayName: string;
  startDate: string;
  endDate: string;
  leaveTypeName: string;
};

export type MssDashboardDto = {
  teamSummary: MssTeamSummaryDto;
  teamAttendanceSnapshot: MssTeamAttendanceEntryDto[];
  upcomingTeamLeave: MssUpcomingLeaveEntryDto[];
};

export const mssDashboardApi = {
  async get(actingForEmployeeId?: string): Promise<MssDashboardDto> {
    return request<MssDashboardDto>(
      `/manager-self-service/dashboard${actingForEmployeeId ? `?actingForEmployeeId=${actingForEmployeeId}` : ""}`,
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Notification Inbox (Sprint 27C) — the cursor-paginated, dismiss-capable    */
/* surface at /api/v1/self-service/notifications. Distinct from the older     */
/* `notificationsApi` above (still real, still at /api/v1/notifications) —    */
/* Sprint 0 moves the Attention Inbox and the /notifications screen onto this */
/* one specifically because it's the only one that supports dismiss.         */
/* -------------------------------------------------------------------------- */

export type NotificationInboxItemDto = {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: string;
  createdAt: string;
};

export type NotificationInboxPageDto = {
  items: NotificationInboxItemDto[];
  nextCursor?: string;
};

export const notificationInboxApi = {
  async list(
    opts: { unreadOnly?: boolean; cursor?: string; limit?: number } = {},
  ): Promise<NotificationInboxPageDto> {
    const params = new URLSearchParams();
    if (opts.unreadOnly) params.set("unreadOnly", "true");
    if (opts.cursor) params.set("cursor", opts.cursor);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<NotificationInboxPageDto>(`/self-service/notifications${qs ? `?${qs}` : ""}`);
  },
  async markRead(id: string): Promise<void> {
    await request<void>(`/self-service/notifications/${id}/read`, { method: "POST" });
  },
  async dismiss(id: string): Promise<void> {
    await request<void>(`/self-service/notifications/${id}/dismiss`, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
  },
};

/**
 * Manager Self-Service decision actions (Sprint 3, FR8) reuse the existing admin
 * approve/reject endpoints as-is. As of Sprint 4 these are genuinely manager-scoped
 * server-side (`LeaveRequestService.requireManagerAuthorityUnlessAdmin` — audit fix
 * #4): a `LEAVE_APPROVE` holder who isn't the target employee's manager (and doesn't
 * also hold `LEAVE_ADMIN`) now gets a 403 from the backend, not just a hidden row in
 * this UI. The pending-list query itself is `leaveSelfServiceApi.pendingForMyReports`
 * (server-scoped + paginated, replacing the old tenant-wide + client-filtered query).
 */
export const leaveApprovalsApi = {
  async approve(id: string, reason?: string): Promise<LeaveRequestDto> {
    return request<LeaveRequestDto>(`/leave/requests/${id}/approve`, {
      method: "POST",
      body: { reason },
    });
  },
  async reject(id: string, reason: string): Promise<LeaveRequestDto> {
    return request<LeaveRequestDto>(`/leave/requests/${id}/reject`, {
      method: "POST",
      body: { reason },
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Notifications (Sprint 4) — com.ewos.notification was an empty package stub */
/* through Sprint 13/3 ("do NOT build the Notification module" per the        */
/* Sprint 13 report); Sprint 4 builds the in-app inbox and wires it here,     */
/* replacing the mock NOTIFICATIONS data the /notifications screen used.      */
/* -------------------------------------------------------------------------- */

export type NotificationDto = {
  id: string;
  type:
    | "TASK_ASSIGNED"
    | "TASK_ESCALATED"
    | "INSTANCE_COMPLETED"
    | "INSTANCE_CANCELLED"
    | "INSTANCE_ERRORED"
    | "GENERIC";
  title: string;
  body?: string;
  link?: string;
  readAt?: string;
  createdAt: string;
};

export const notificationsApi = {
  async mine(page = 0, size = 20): Promise<SpringPage<NotificationDto>> {
    return request<SpringPage<NotificationDto>>(`/notifications/mine?page=${page}&size=${size}`);
  },
  async unreadCount(): Promise<number> {
    const data = await request<{ unreadCount: number }>("/notifications/mine/unread-count");
    return data.unreadCount;
  },
  async markRead(id: string): Promise<void> {
    await request<void>(`/notifications/${id}/read`, { method: "POST" });
  },
};

/* -------------------------------------------------------------------------- */
/* Tenant Access Grants (Sprint 2.2) — not a CrudScreen fit: grants are       */
/* created/revoked, never edited, and list is per-user (GET ?userId=).       */
/* -------------------------------------------------------------------------- */

export type TenantAccessGrantDto = {
  id: string;
  userId: string;
  tenantId: string;
  grantedBy?: string;
  reason: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const tenantAccessGrantApi = {
  async listForUser(userId: string): Promise<TenantAccessGrantDto[]> {
    return request<TenantAccessGrantDto[]>(`/tenant-access-grants?userId=${userId}`);
  },
  async grant(payload: {
    userId: string;
    tenantId: string;
    reason: string;
    expiresAt: string;
  }): Promise<TenantAccessGrantDto> {
    return request<TenantAccessGrantDto>("/tenant-access-grants", {
      method: "POST",
      body: payload,
    });
  },
  async revoke(id: string): Promise<TenantAccessGrantDto> {
    return request<TenantAccessGrantDto>(`/tenant-access-grants/${id}/revoke`, {
      method: "POST",
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
 * Fallback: per-resource counts. `/employees` and `/roles` are both real,
 * tenant-scoped endpoints (Sprint 1.1 / 1.4) — `tenantId` is the caller's
 * resolved tenant (see useTenant()), falling back to DEFAULT_TENANT_ID only
 * if not yet resolved. `/departments` has no backend endpoint at all
 * (Organization concepts aren't a standalone list resource) and will always
 * resolve to `null` — the UI renders "—" for that card without blocking the
 * rest.
 *
 * Never throws: the dashboard must never be blocked by unimplemented endpoints.
 */
export const dashboardApi = {
  async summary(tenantId?: string): Promise<DashboardSummary> {
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
    const effectiveTenantId = tenantId ?? DEFAULT_TENANT_ID;
    const [employees, users, departments, roles] = await Promise.all([
      safeCount(`/employees?tenantId=${effectiveTenantId}`),
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
