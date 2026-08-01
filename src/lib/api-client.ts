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

export type WorkflowDefinitionDto = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  subjectType: string;
  definitionVersion: number;
  active: boolean;
};

export const workflowDefinitionApi = {
  /** Sprint 22B — used to resolve the active RECRUITMENT_REQUISITION_APPROVAL /
   *  OFFER_APPROVAL definition id these submit-for-approval actions require. */
  async list(): Promise<WorkflowDefinitionDto[]> {
    return request<WorkflowDefinitionDto[]>("/workflow/definitions");
  },
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

/* ══════════════════════════════════════════════════════════════════════════ */
/* Recruitment — Sprint 22B                                                   */
/* com.ewos.recruitment / com.ewos.ats / com.ewos.interview / com.ewos.offer  */
/*                                                                            */
/* Hand-written (not resourceApi) throughout: every list endpoint here takes  */
/* a required companyId/status query param resourceApi's fixed extraQuery    */
/* can't vary per call, several actions are bespoke lifecycle transitions     */
/* with no CRUD shape, and two Preboarding endpoints bind the entire request  */
/* body to a bare string rather than a JSON object. Each `xxxApi` mirrors the */
/* matching backend controller 1:1 — see EWOS SPRINT_22A_COMPLETION and the   */
/* controllers under com.ewos.{recruitment,ats,interview,offer}.api for the   */
/* source of truth this was transcribed from.                                */
/* ══════════════════════════════════════════════════════════════════════════ */

// ---- Shared enums -----------------------------------------------------------

/** Identical value set on both com.ewos.recruitment.domain.EmploymentType and
 *  com.ewos.offer.domain.EmploymentType (distinct Java enums, same strings). */
export type RecruitmentEmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "TEMPORARY"
  | "INTERN"
  | "CONSULTANT";

export const EMPLOYMENT_TYPES: RecruitmentEmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERN",
  "CONSULTANT",
];

// ---- Job Positions ------------------------------------------------------------

export type JobPositionDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  title: string;
  description?: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType: RecruitmentEmploymentType;
  grade?: string;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  active: boolean;
  versionNo: number;
};

export type JobPositionPayload = {
  tenantId?: string;
  companyId?: string;
  code?: string;
  title: string;
  description?: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType: RecruitmentEmploymentType;
  grade?: string;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  active?: boolean;
};

export const jobPositionApi = {
  async listForCompany(companyId: string): Promise<JobPositionDto[]> {
    return request<JobPositionDto[]>(`/recruitment/positions?companyId=${companyId}`);
  },
  async getById(id: string): Promise<JobPositionDto> {
    return request<JobPositionDto>(`/recruitment/positions/${id}`);
  },
  async create(payload: JobPositionPayload): Promise<JobPositionDto> {
    return request<JobPositionDto>("/recruitment/positions", { method: "POST", body: payload });
  },
  async update(id: string, payload: JobPositionPayload): Promise<JobPositionDto> {
    return request<JobPositionDto>(`/recruitment/positions/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/recruitment/positions/${id}`, { method: "DELETE" });
  },
};

// ---- Job Requisitions -----------------------------------------------------

export type RequisitionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export const REQUISITION_PRIORITIES: RequisitionPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export type RequisitionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "OPEN"
  | "ON_HOLD"
  | "FILLED"
  | "CLOSED"
  | "CANCELLED";

export const REQUISITION_STATUSES: RequisitionStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "OPEN",
  "ON_HOLD",
  "FILLED",
  "CLOSED",
  "CANCELLED",
];

export type JobRequisitionDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  requisitionNumber: string;
  jobPositionId: string;
  title: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType: RecruitmentEmploymentType;
  headcount: number;
  filledCount: number;
  priority: RequisitionPriority;
  justification?: string;
  hiringManagerId?: string;
  recruiterId?: string;
  targetStartDate?: string;
  budgetCurrency?: string;
  budgetAmount?: number;
  status: RequisitionStatus;
  workflowInstanceId?: string;
  submittedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNotes?: string;
  openedAt?: string;
  closedAt?: string;
  closedReason?: string;
  versionNo: number;
};

export type CreateJobRequisitionPayload = {
  tenantId: string;
  companyId: string;
  requisitionNumber: string;
  jobPositionId: string;
  title: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType: RecruitmentEmploymentType;
  headcount: number;
  priority?: RequisitionPriority;
  justification?: string;
  hiringManagerId?: string;
  recruiterId?: string;
  targetStartDate?: string;
  budgetCurrency?: string;
  budgetAmount?: number;
};

export type UpdateJobRequisitionPayload = Omit<
  CreateJobRequisitionPayload,
  "tenantId" | "companyId" | "requisitionNumber" | "jobPositionId"
>;

export const jobRequisitionApi = {
  async create(payload: CreateJobRequisitionPayload): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>("/recruitment/requisitions", {
      method: "POST",
      body: payload,
    });
  },
  async update(id: string, payload: UpdateJobRequisitionPayload): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  async submit(id: string, workflowDefinitionId: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/submit`, {
      method: "POST",
      body: { workflowDefinitionId },
    });
  },
  async approve(id: string, notes?: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/approve`, {
      method: "POST",
      body: notes ? { notes } : undefined,
    });
  },
  async reject(id: string, notes?: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/reject`, {
      method: "POST",
      body: notes ? { notes } : undefined,
    });
  },
  async open(id: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/open`, {
      method: "POST",
    });
  },
  async hold(id: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/hold`, {
      method: "POST",
    });
  },
  async resume(id: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/resume`, {
      method: "POST",
    });
  },
  async recordFill(id: string, fills = 1): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/fill`, {
      method: "POST",
      body: { fills },
    });
  },
  async close(id: string, reason: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/close`, {
      method: "POST",
      body: { reason },
    });
  },
  async cancel(id: string, reason: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}/cancel`, {
      method: "POST",
      body: { reason },
    });
  },
  async getById(id: string): Promise<JobRequisitionDto> {
    return request<JobRequisitionDto>(`/recruitment/requisitions/${id}`);
  },
  async byStatus(companyId: string, status: RequisitionStatus): Promise<JobRequisitionDto[]> {
    return request<JobRequisitionDto[]>(
      `/recruitment/requisitions?companyId=${companyId}&status=${status}`,
    );
  },
};

// ---- Candidates (ATS) -------------------------------------------------------

export type CandidateSource =
  | "REFERRAL"
  | "JOB_BOARD"
  | "AGENCY"
  | "CAMPUS"
  | "DIRECT"
  | "INTERNAL"
  | "WEBSITE"
  | "LINKEDIN"
  | "SOCIAL_MEDIA"
  | "EVENT"
  | "WALK_IN"
  | "OTHER";

export const CANDIDATE_SOURCES: CandidateSource[] = [
  "REFERRAL",
  "JOB_BOARD",
  "AGENCY",
  "CAMPUS",
  "DIRECT",
  "INTERNAL",
  "WEBSITE",
  "LINKEDIN",
  "SOCIAL_MEDIA",
  "EVENT",
  "WALK_IN",
  "OTHER",
];

export type CandidateGender = "MALE" | "FEMALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY" | "OTHER";
export const CANDIDATE_GENDERS: CandidateGender[] = [
  "MALE",
  "FEMALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
  "OTHER",
];

export type CandidateStatus = "NEW" | "ACTIVE" | "ENGAGED" | "HIRED" | "ARCHIVED" | "BLACKLISTED";
export const CANDIDATE_STATUSES: CandidateStatus[] = [
  "NEW",
  "ACTIVE",
  "ENGAGED",
  "HIRED",
  "ARCHIVED",
  "BLACKLISTED",
];

export type CandidateConsentSource =
  | "APPLICATION_FORM"
  | "MANUAL_ENTRY"
  | "REFERRAL"
  | "AGENCY"
  | "IMPORTED"
  | "OTHER";
export const CANDIDATE_CONSENT_SOURCES: CandidateConsentSource[] = [
  "APPLICATION_FORM",
  "MANUAL_ENTRY",
  "REFERRAL",
  "AGENCY",
  "IMPORTED",
  "OTHER",
];

export type DuplicateMatchType = "EMAIL_EXACT" | "PHONE_EXACT";

export type DuplicateCandidateMatchDto = {
  candidateId: string;
  candidateNumber: string;
  fullName: string;
  matchType: DuplicateMatchType;
};

export type CandidateDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  candidateNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: CandidateGender;
  nationality?: string;
  currentLocation?: string;
  country?: string;
  currentEmployer?: string;
  currentDesignation?: string;
  totalExperienceMonths?: number;
  currentCtcCurrency?: string;
  currentCtcAmount?: number;
  expectedCtcCurrency?: string;
  expectedCtcAmount?: number;
  noticePeriodDays?: number;
  source: CandidateSource;
  sourceDetails?: string;
  referrerEmployeeId?: string;
  internal: boolean;
  internalEmployeeId?: string;
  status: CandidateStatus;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  consentGiven: boolean;
  consentGivenAt?: string;
  consentWithdrawnAt?: string;
  consentSource?: CandidateConsentSource;
  retentionPolicyCode?: string;
  retentionExpiresAt?: string;
  versionNo: number;
};

export type CandidatePayload = {
  tenantId?: string;
  companyId?: string;
  candidateNumber?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: CandidateGender;
  nationality?: string;
  currentLocation?: string;
  country?: string;
  currentEmployer?: string;
  currentDesignation?: string;
  totalExperienceMonths?: number;
  currentCtcCurrency?: string;
  currentCtcAmount?: number;
  expectedCtcCurrency?: string;
  expectedCtcAmount?: number;
  noticePeriodDays?: number;
  source: CandidateSource;
  sourceDetails?: string;
  referrerEmployeeId?: string;
  internal?: boolean;
  internalEmployeeId?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
};

export type CreateCandidateResult = {
  candidate: CandidateDto;
  potentialDuplicates: DuplicateCandidateMatchDto[];
};

export const candidateApi = {
  async create(payload: CandidatePayload): Promise<CreateCandidateResult> {
    return request<CreateCandidateResult>("/ats/candidates", { method: "POST", body: payload });
  },
  async update(id: string, payload: CandidatePayload): Promise<CandidateDto> {
    return request<CandidateDto>(`/ats/candidates/${id}`, { method: "PUT", body: payload });
  },
  async changeStatus(id: string, status: CandidateStatus, reason?: string): Promise<CandidateDto> {
    return request<CandidateDto>(`/ats/candidates/${id}/status`, {
      method: "POST",
      body: { status, reason },
    });
  },
  async recordConsent(
    id: string,
    payload: {
      consentGiven: boolean;
      consentSource?: CandidateConsentSource;
      retentionPolicyCode?: string;
      retentionExpiresAt?: string;
    },
  ): Promise<CandidateDto> {
    return request<CandidateDto>(`/ats/candidates/${id}/consent`, {
      method: "POST",
      body: payload,
    });
  },
  async getById(id: string): Promise<CandidateDto> {
    return request<CandidateDto>(`/ats/candidates/${id}`);
  },
  async list(
    companyId: string,
    status?: CandidateStatus,
    page = 0,
    size = 20,
  ): Promise<SpringPage<CandidateDto>> {
    const statusQs = status ? `&status=${status}` : "";
    return request<SpringPage<CandidateDto>>(
      `/ats/candidates?companyId=${companyId}${statusQs}&page=${page}&size=${size}`,
    );
  },
  async checkDuplicates(email?: string, phone?: string): Promise<DuplicateCandidateMatchDto[]> {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (phone) params.set("phone", phone);
    return request<DuplicateCandidateMatchDto[]>(`/ats/candidates/duplicates?${params}`);
  },
};

// ---- Candidate sub-resources: resumes, documents, notes, tags, comms, timeline

export type CandidateResumeDto = {
  id: string;
  candidateId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUri: string;
  primary: boolean;
  parsed: boolean;
  parsedAt?: string;
  parserVersion?: string;
  uploadedAt: string;
  versionNo: number;
};

export const candidateResumeApi = {
  async upload(
    candidateId: string,
    payload: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      storageUri: string;
      primary?: boolean;
      rawTextForParsing?: string;
    },
  ): Promise<CandidateResumeDto> {
    return request<CandidateResumeDto>(`/ats/candidates/${candidateId}/resumes`, {
      method: "POST",
      body: payload,
    });
  },
  async list(candidateId: string): Promise<CandidateResumeDto[]> {
    return request<CandidateResumeDto[]>(`/ats/candidates/${candidateId}/resumes`);
  },
  async markPrimary(resumeId: string): Promise<CandidateResumeDto> {
    return request<CandidateResumeDto>(`/ats/resumes/${resumeId}/primary`, { method: "POST" });
  },
  async remove(resumeId: string): Promise<void> {
    await request<void>(`/ats/resumes/${resumeId}`, { method: "DELETE" });
  },
};

export type DocumentType =
  | "ID_PROOF"
  | "ADDRESS_PROOF"
  | "EDUCATION"
  | "EXPERIENCE_LETTER"
  | "RELIEVING_LETTER"
  | "PAYSLIP"
  | "CERTIFICATION"
  | "PORTFOLIO"
  | "OFFER_LETTER"
  | "SIGNED_NDA"
  | "OTHER";
export const DOCUMENT_TYPES: DocumentType[] = [
  "ID_PROOF",
  "ADDRESS_PROOF",
  "EDUCATION",
  "EXPERIENCE_LETTER",
  "RELIEVING_LETTER",
  "PAYSLIP",
  "CERTIFICATION",
  "PORTFOLIO",
  "OFFER_LETTER",
  "SIGNED_NDA",
  "OTHER",
];

export type CandidateDocumentDto = {
  id: string;
  candidateId: string;
  documentType: DocumentType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUri: string;
  notes?: string;
  uploadedAt: string;
  versionNo: number;
};

export const candidateDocumentApi = {
  async upload(
    candidateId: string,
    payload: {
      documentType: DocumentType;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      storageUri: string;
      notes?: string;
    },
  ): Promise<CandidateDocumentDto> {
    return request<CandidateDocumentDto>(`/ats/candidates/${candidateId}/documents`, {
      method: "POST",
      body: payload,
    });
  },
  async list(candidateId: string): Promise<CandidateDocumentDto[]> {
    return request<CandidateDocumentDto[]>(`/ats/candidates/${candidateId}/documents`);
  },
  async remove(documentId: string): Promise<void> {
    await request<void>(`/ats/documents/${documentId}`, { method: "DELETE" });
  },
};

export type NoteType = "GENERAL" | "SCREENING" | "INTERVIEW" | "HR" | "REFERENCE_CHECK" | "OFFER";
export const NOTE_TYPES: NoteType[] = [
  "GENERAL",
  "SCREENING",
  "INTERVIEW",
  "HR",
  "REFERENCE_CHECK",
  "OFFER",
];

export type CandidateNoteDto = {
  id: string;
  candidateId: string;
  noteType: NoteType;
  body: string;
  privateNote: boolean;
  createdBy?: string;
  createdAt: string;
  versionNo: number;
};

export const candidateNoteApi = {
  async add(
    candidateId: string,
    payload: { noteType: NoteType; body: string; privateNote?: boolean },
  ): Promise<CandidateNoteDto> {
    return request<CandidateNoteDto>(`/ats/candidates/${candidateId}/notes`, {
      method: "POST",
      body: payload,
    });
  },
  async list(candidateId: string): Promise<CandidateNoteDto[]> {
    return request<CandidateNoteDto[]>(`/ats/candidates/${candidateId}/notes`);
  },
};

export type CandidateTagDto = { id: string; candidateId: string; tag: string };

export const candidateTagApi = {
  async add(candidateId: string, tag: string): Promise<CandidateTagDto> {
    return request<CandidateTagDto>(`/ats/candidates/${candidateId}/tags`, {
      method: "POST",
      body: { tag },
    });
  },
  async list(candidateId: string): Promise<CandidateTagDto[]> {
    return request<CandidateTagDto[]>(`/ats/candidates/${candidateId}/tags`);
  },
  async remove(candidateId: string, tag: string): Promise<void> {
    await request<void>(`/ats/candidates/${candidateId}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    });
  },
};

export type CommunicationChannel =
  | "EMAIL"
  | "PHONE"
  | "SMS"
  | "WHATSAPP"
  | "IN_PERSON"
  | "VIDEO"
  | "LINKEDIN"
  | "OTHER";
export const COMMUNICATION_CHANNELS: CommunicationChannel[] = [
  "EMAIL",
  "PHONE",
  "SMS",
  "WHATSAPP",
  "IN_PERSON",
  "VIDEO",
  "LINKEDIN",
  "OTHER",
];

export type CommunicationDirection = "INBOUND" | "OUTBOUND";

export type CandidateCommunicationDto = {
  id: string;
  candidateId: string;
  applicationId?: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject?: string;
  bodySummary?: string;
  externalRef?: string;
  occurredAt: string;
  sentBy?: string;
  versionNo: number;
};

export const candidateCommunicationApi = {
  async log(
    candidateId: string,
    payload: {
      channel: CommunicationChannel;
      direction: CommunicationDirection;
      applicationId?: string;
      subject?: string;
      bodySummary?: string;
      externalRef?: string;
      occurredAt?: string;
    },
  ): Promise<CandidateCommunicationDto> {
    return request<CandidateCommunicationDto>(`/ats/candidates/${candidateId}/communications`, {
      method: "POST",
      body: payload,
    });
  },
  async list(candidateId: string): Promise<CandidateCommunicationDto[]> {
    return request<CandidateCommunicationDto[]>(`/ats/candidates/${candidateId}/communications`);
  },
};

export type TimelineEventType =
  | "CANDIDATE_CREATED"
  | "CANDIDATE_UPDATED"
  | "CANDIDATE_STATUS_CHANGED"
  | "CANDIDATE_CONSENT_RECORDED"
  | "CANDIDATE_CONSENT_WITHDRAWN"
  | "CANDIDATE_TAGGED"
  | "CANDIDATE_UNTAGGED"
  | "RESUME_UPLOADED"
  | "RESUME_MARKED_PRIMARY"
  | "RESUME_PARSED"
  | "DOCUMENT_UPLOADED"
  | "NOTE_ADDED"
  | "COMMUNICATION_LOGGED"
  | "APPLICATION_CREATED"
  | "APPLICATION_STATUS_CHANGED"
  | "APPLICATION_REJECTED"
  | "APPLICATION_WITHDRAWN"
  | "APPLICATION_HIRED";

export type CandidateTimelineEventDto = {
  id: string;
  candidateId: string;
  applicationId?: string;
  eventType: TimelineEventType;
  eventSummary: string;
  eventData?: string;
  actorId?: string;
  occurredAt: string;
};

export const candidateTimelineApi = {
  async forCandidate(candidateId: string): Promise<CandidateTimelineEventDto[]> {
    return request<CandidateTimelineEventDto[]>(`/ats/candidates/${candidateId}/timeline`);
  },
  async forApplication(applicationId: string): Promise<CandidateTimelineEventDto[]> {
    return request<CandidateTimelineEventDto[]>(`/ats/applications/${applicationId}/timeline`);
  },
};

// ---- Job Applications (ATS pipeline) ----------------------------------------

export type ApplicationStatus =
  | "NEW"
  | "SCREENING"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWING"
  | "INTERVIEW_COMPLETED"
  | "OFFER_INITIATED"
  | "OFFER_EXTENDED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "HIRED"
  | "ONBOARDING"
  | "ON_HOLD"
  | "REJECTED"
  | "WITHDRAWN";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "NEW",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWING",
  "INTERVIEW_COMPLETED",
  "OFFER_INITIATED",
  "OFFER_EXTENDED",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "HIRED",
  "ONBOARDING",
  "ON_HOLD",
  "REJECTED",
  "WITHDRAWN",
];

/** Forward-only pipeline order — the exact sequence ApplicationPolicy.FORWARD allows. */
export const APPLICATION_FORWARD_STAGES: ApplicationStatus[] = [
  "NEW",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWING",
  "INTERVIEW_COMPLETED",
  "OFFER_INITIATED",
  "OFFER_EXTENDED",
  "OFFER_ACCEPTED",
  "ONBOARDING",
  "HIRED",
];

export type RejectionReason =
  | "NOT_QUALIFIED"
  | "POOR_INTERVIEW"
  | "COMPENSATION_MISMATCH"
  | "LOCATION_MISMATCH"
  | "EXPERIENCE_MISMATCH"
  | "POSITION_CLOSED"
  | "CANDIDATE_WITHDREW"
  | "DUPLICATE"
  | "BACKGROUND_CHECK_FAILED"
  | "OTHER";
export const REJECTION_REASONS: RejectionReason[] = [
  "NOT_QUALIFIED",
  "POOR_INTERVIEW",
  "COMPENSATION_MISMATCH",
  "LOCATION_MISMATCH",
  "EXPERIENCE_MISMATCH",
  "POSITION_CLOSED",
  "CANDIDATE_WITHDREW",
  "DUPLICATE",
  "BACKGROUND_CHECK_FAILED",
  "OTHER",
];

export type JobApplicationDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  applicationNumber: string;
  candidateId: string;
  jobRequisitionId: string;
  resumeId?: string;
  source: CandidateSource;
  sourceDetails?: string;
  referredByEmployeeId?: string;
  status: ApplicationStatus;
  workflowInstanceId?: string;
  appliedAt: string;
  screenedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNotes?: string;
  rejectionReason?: RejectionReason;
  versionNo: number;
};

export const jobApplicationApi = {
  async create(payload: {
    tenantId: string;
    companyId: string;
    applicationNumber: string;
    candidateId: string;
    jobRequisitionId: string;
    resumeId?: string;
    source: CandidateSource;
    sourceDetails?: string;
    referredByEmployeeId?: string;
  }): Promise<JobApplicationDto> {
    return request<JobApplicationDto>("/ats/applications", { method: "POST", body: payload });
  },
  async advance(
    id: string,
    targetStatus: ApplicationStatus,
    notes?: string,
  ): Promise<JobApplicationDto> {
    return request<JobApplicationDto>(`/ats/applications/${id}/advance`, {
      method: "POST",
      body: { targetStatus, notes },
    });
  },
  async hold(id: string): Promise<JobApplicationDto> {
    return request<JobApplicationDto>(`/ats/applications/${id}/hold`, { method: "POST" });
  },
  async resume(
    id: string,
    targetStatus: ApplicationStatus,
    notes?: string,
  ): Promise<JobApplicationDto> {
    return request<JobApplicationDto>(`/ats/applications/${id}/resume`, {
      method: "POST",
      body: { targetStatus, notes },
    });
  },
  async reject(id: string, reason: RejectionReason, notes?: string): Promise<JobApplicationDto> {
    return request<JobApplicationDto>(`/ats/applications/${id}/reject`, {
      method: "POST",
      body: { reason, notes },
    });
  },
  async withdraw(id: string, notes: string): Promise<JobApplicationDto> {
    return request<JobApplicationDto>(`/ats/applications/${id}/withdraw`, {
      method: "POST",
      body: { notes },
    });
  },
  async getById(id: string): Promise<JobApplicationDto> {
    return request<JobApplicationDto>(`/ats/applications/${id}`);
  },
  async byCandidate(candidateId: string): Promise<JobApplicationDto[]> {
    return request<JobApplicationDto[]>(`/ats/applications/by-candidate/${candidateId}`);
  },
  async byRequisition(requisitionId: string): Promise<JobApplicationDto[]> {
    return request<JobApplicationDto[]>(`/ats/applications/by-requisition/${requisitionId}`);
  },
  async byStatus(
    companyId: string,
    status: ApplicationStatus,
    page = 0,
    size = 20,
  ): Promise<SpringPage<JobApplicationDto>> {
    return request<SpringPage<JobApplicationDto>>(
      `/ats/applications?companyId=${companyId}&status=${status}&page=${page}&size=${size}`,
    );
  },
};

// ---- Interview Rounds --------------------------------------------------------

export type InterviewType =
  | "PHONE_SCREEN"
  | "TECHNICAL"
  | "BEHAVIORAL"
  | "PANEL"
  | "HR"
  | "EXECUTIVE"
  | "TAKE_HOME"
  | "LIVE_CODING"
  | "ONSITE"
  | "FINAL"
  | "OTHER";
export const INTERVIEW_TYPES: InterviewType[] = [
  "PHONE_SCREEN",
  "TECHNICAL",
  "BEHAVIORAL",
  "PANEL",
  "HR",
  "EXECUTIVE",
  "TAKE_HOME",
  "LIVE_CODING",
  "ONSITE",
  "FINAL",
  "OTHER",
];

export type InterviewMode = "VIDEO" | "IN_PERSON" | "PHONE" | "HYBRID";
export const INTERVIEW_MODES: InterviewMode[] = ["VIDEO", "IN_PERSON", "PHONE", "HYBRID"];

export type InterviewStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RESCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "PENDING_FEEDBACK";
export const INTERVIEW_STATUSES: InterviewStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "RESCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "PENDING_FEEDBACK",
];

export type InterviewDecision = "PENDING" | "PROCEED" | "HOLD" | "REJECT";
export const INTERVIEW_DECISIONS: InterviewDecision[] = ["PENDING", "PROCEED", "HOLD", "REJECT"];

export type InterviewRoundDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  applicationId: string;
  templateId?: string;
  roundNumber: number;
  name: string;
  interviewType: InterviewType;
  durationMinutes: number;
  mode: InterviewMode;
  location?: string;
  meetingUrl?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  status: InterviewStatus;
  decision: InterviewDecision;
  decisionNotes?: string;
  decidedAt?: string;
  decidedBy?: string;
  coordinatorEmployeeId?: string;
  externalCalendarRef?: string;
  versionNo: number;
};

export const interviewRoundApi = {
  async create(payload: {
    applicationId: string;
    templateId?: string;
    name: string;
    interviewType: InterviewType;
    durationMinutes?: number;
    mode: InterviewMode;
    location?: string;
    meetingUrl?: string;
    coordinatorEmployeeId?: string;
  }): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>("/interviews/rounds", { method: "POST", body: payload });
  },
  async schedule(
    id: string,
    scheduledStart: string,
    scheduledEnd: string,
  ): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/schedule`, {
      method: "POST",
      body: { scheduledStart, scheduledEnd },
    });
  },
  async reschedule(
    id: string,
    scheduledStart: string,
    scheduledEnd: string,
  ): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/reschedule`, {
      method: "POST",
      body: { scheduledStart, scheduledEnd },
    });
  },
  async start(id: string): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/start`, { method: "POST" });
  },
  async complete(id: string): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/complete`, { method: "POST" });
  },
  async markNoShow(id: string): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/no-show`, { method: "POST" });
  },
  async cancel(id: string, reason: string): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/cancel`, {
      method: "POST",
      body: { reason },
    });
  },
  async decide(
    id: string,
    decision: InterviewDecision,
    notes?: string,
  ): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}/decision`, {
      method: "POST",
      body: { decision, notes },
    });
  },
  async getById(id: string): Promise<InterviewRoundDto> {
    return request<InterviewRoundDto>(`/interviews/rounds/${id}`);
  },
  async forApplication(applicationId: string): Promise<InterviewRoundDto[]> {
    return request<InterviewRoundDto[]>(`/interviews/rounds/by-application/${applicationId}`);
  },
  async byStatus(companyId: string, status: InterviewStatus): Promise<InterviewRoundDto[]> {
    return request<InterviewRoundDto[]>(
      `/interviews/rounds?companyId=${companyId}&status=${status}`,
    );
  },
  async scheduledBetween(
    companyId: string,
    from: string,
    to: string,
  ): Promise<InterviewRoundDto[]> {
    return request<InterviewRoundDto[]>(
      `/interviews/rounds/scheduled?companyId=${companyId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  },
};

// ---- Interview Panel ---------------------------------------------------------

export type InterviewParticipantRole = "INTERVIEWER" | "PANEL_LEAD" | "OBSERVER" | "COORDINATOR";
export const INTERVIEW_PARTICIPANT_ROLES: InterviewParticipantRole[] = [
  "INTERVIEWER",
  "PANEL_LEAD",
  "OBSERVER",
  "COORDINATOR",
];

export type InterviewParticipantAttendance = "UNKNOWN" | "ATTENDED" | "ABSENT" | "PARTIAL";
export const INTERVIEW_PARTICIPANT_ATTENDANCE: InterviewParticipantAttendance[] = [
  "UNKNOWN",
  "ATTENDED",
  "ABSENT",
  "PARTIAL",
];

export type InterviewParticipantDto = {
  id: string;
  roundId: string;
  employeeId: string;
  role: InterviewParticipantRole;
  attendance: InterviewParticipantAttendance;
  notes?: string;
  externalCalendarRef?: string;
  versionNo: number;
};

export const interviewPanelApi = {
  async add(
    roundId: string,
    payload: { employeeId: string; role?: InterviewParticipantRole; notes?: string },
  ): Promise<InterviewParticipantDto> {
    return request<InterviewParticipantDto>(`/interviews/rounds/${roundId}/participants`, {
      method: "POST",
      body: payload,
    });
  },
  async updateAttendance(
    participantId: string,
    attendance: InterviewParticipantAttendance,
  ): Promise<InterviewParticipantDto> {
    return request<InterviewParticipantDto>(
      `/interviews/participants/${participantId}/attendance`,
      {
        method: "PUT",
        body: { attendance },
      },
    );
  },
  async remove(participantId: string): Promise<void> {
    await request<void>(`/interviews/participants/${participantId}`, { method: "DELETE" });
  },
  async list(roundId: string): Promise<InterviewParticipantDto[]> {
    return request<InterviewParticipantDto[]>(`/interviews/rounds/${roundId}/participants`);
  },
};

// ---- Interview Templates ------------------------------------------------------

export type InterviewTemplateDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  interviewType: InterviewType;
  defaultDurationMinutes: number;
  scorecardSchema?: string;
  active: boolean;
  versionNo: number;
};

export type InterviewTemplatePayload = {
  tenantId?: string;
  companyId?: string;
  code?: string;
  name: string;
  description?: string;
  interviewType: InterviewType;
  defaultDurationMinutes?: number;
  scorecardSchema?: string;
  active?: boolean;
};

export const interviewTemplateApi = {
  async create(payload: InterviewTemplatePayload): Promise<InterviewTemplateDto> {
    return request<InterviewTemplateDto>("/interviews/templates", {
      method: "POST",
      body: payload,
    });
  },
  async update(id: string, payload: InterviewTemplatePayload): Promise<InterviewTemplateDto> {
    return request<InterviewTemplateDto>(`/interviews/templates/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  async getById(id: string): Promise<InterviewTemplateDto> {
    return request<InterviewTemplateDto>(`/interviews/templates/${id}`);
  },
  async listForCompany(companyId: string): Promise<InterviewTemplateDto[]> {
    return request<InterviewTemplateDto[]>(`/interviews/templates?companyId=${companyId}`);
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/interviews/templates/${id}`, { method: "DELETE" });
  },
};

// ---- Interview Scorecards + Candidate Feedback --------------------------------

export type ScorecardRecommendation =
  | "STRONG_HIRE"
  | "HIRE"
  | "LEAN_HIRE"
  | "NO_DECISION"
  | "LEAN_NO_HIRE"
  | "NO_HIRE"
  | "STRONG_NO_HIRE";
export const SCORECARD_RECOMMENDATIONS: ScorecardRecommendation[] = [
  "STRONG_HIRE",
  "HIRE",
  "LEAN_HIRE",
  "NO_DECISION",
  "LEAN_NO_HIRE",
  "NO_HIRE",
  "STRONG_NO_HIRE",
];

export type InterviewScorecardDto = {
  id: string;
  roundId: string;
  interviewerId: string;
  overallRating?: number;
  recommendation: ScorecardRecommendation;
  strengths?: string;
  weaknesses?: string;
  comments?: string;
  criteriaJson?: string;
  submittedAt: string;
  versionNo: number;
};

export type RoundScorecardSummaryDto = {
  submittedCount: number;
  averageRating?: number;
  weightedRecommendationScore?: number;
  leansHire: boolean;
  scorecards: InterviewScorecardDto[];
};

export const interviewScorecardApi = {
  async submit(
    roundId: string,
    payload: {
      interviewerId: string;
      overallRating?: number;
      recommendation: ScorecardRecommendation;
      strengths?: string;
      weaknesses?: string;
      comments?: string;
      criteriaJson?: string;
    },
  ): Promise<InterviewScorecardDto> {
    return request<InterviewScorecardDto>(`/interviews/rounds/${roundId}/scorecards`, {
      method: "POST",
      body: payload,
    });
  },
  async list(roundId: string): Promise<InterviewScorecardDto[]> {
    return request<InterviewScorecardDto[]>(`/interviews/rounds/${roundId}/scorecards`);
  },
  async summary(roundId: string): Promise<RoundScorecardSummaryDto> {
    return request<RoundScorecardSummaryDto>(`/interviews/rounds/${roundId}/scorecards/summary`);
  },
};

export type CandidateInterviewFeedbackDto = {
  id: string;
  roundId: string;
  candidateId: string;
  ratingExperience?: number;
  ratingProcess?: number;
  wouldReapply?: boolean;
  comments?: string;
  submittedAt: string;
  versionNo: number;
};

export const candidateInterviewFeedbackApi = {
  async submit(
    roundId: string,
    payload: {
      ratingExperience?: number;
      ratingProcess?: number;
      wouldReapply?: boolean;
      comments?: string;
    },
  ): Promise<CandidateInterviewFeedbackDto> {
    return request<CandidateInterviewFeedbackDto>(
      `/interviews/rounds/${roundId}/candidate-feedback`,
      { method: "POST", body: payload },
    );
  },
  /** Returns null when no feedback has been submitted for this round yet (404). */
  async get(roundId: string): Promise<CandidateInterviewFeedbackDto | null> {
    try {
      return await request<CandidateInterviewFeedbackDto>(
        `/interviews/rounds/${roundId}/candidate-feedback`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};

// ---- Offers ------------------------------------------------------------------

export type OfferStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXTENDED"
  | "ACCEPTED"
  | "DECLINED"
  | "REVISED"
  | "EXPIRED"
  | "WITHDRAWN";
export const OFFER_STATUSES: OfferStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXTENDED",
  "ACCEPTED",
  "DECLINED",
  "REVISED",
  "EXPIRED",
  "WITHDRAWN",
];

export type NegotiationParty = "CANDIDATE" | "COMPANY";

export type OfferDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  offerNumber: string;
  applicationId: string;
  candidateId?: string;
  jobRequisitionId?: string;
  templateId?: string;
  version: number;
  previousOfferId?: string;
  designation: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType: RecruitmentEmploymentType;
  targetJoiningDate?: string;
  currency: string;
  baseSalary: number;
  variablePay?: number;
  oneTimeBonus?: number;
  hiringBonus?: number;
  retentionBonus?: number;
  totalCtc: number;
  noticePeriodDays?: number;
  probationDays?: number;
  offerDocumentUri?: string;
  status: OfferStatus;
  approvalWorkflowInstanceId?: string;
  submittedAt?: string;
  approvedAt?: string;
  extendedAt?: string;
  expiresAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  revisedAt?: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
  versionNo: number;
};

export type CreateOfferPayload = {
  tenantId: string;
  companyId: string;
  offerNumber: string;
  applicationId: string;
  templateId?: string;
  designation: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType: RecruitmentEmploymentType;
  targetJoiningDate?: string;
  currency: string;
  baseSalary: number;
  variablePay?: number;
  oneTimeBonus?: number;
  hiringBonus?: number;
  retentionBonus?: number;
  totalCtc: number;
  salaryBreakdownJson?: string;
  benefitsJson?: string;
  noticePeriodDays?: number;
  probationDays?: number;
  offerBody?: string;
  offerDocumentUri?: string;
};

export type UpdateOfferPayload = Omit<
  CreateOfferPayload,
  "tenantId" | "companyId" | "offerNumber" | "applicationId" | "templateId"
>;

export type OfferNegotiationDto = {
  id: string;
  offerId: string;
  proposedBy: NegotiationParty;
  proposedChangesJson?: string;
  notes?: string;
  submittedAt: string;
  respondedAt?: string;
  accepted?: boolean;
  resultingOfferId?: string;
};

export const offerApi = {
  async create(payload: CreateOfferPayload): Promise<OfferDto> {
    return request<OfferDto>("/offers", { method: "POST", body: payload });
  },
  async update(id: string, payload: UpdateOfferPayload): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}`, { method: "PUT", body: payload });
  },
  async submit(id: string, workflowDefinitionId: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/submit`, {
      method: "POST",
      body: { workflowDefinitionId },
    });
  },
  async approve(id: string, notes?: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/approve`, {
      method: "POST",
      body: notes ? { notes } : undefined,
    });
  },
  async reject(id: string, notes?: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/reject`, {
      method: "POST",
      body: notes ? { notes } : undefined,
    });
  },
  async extend(id: string, expiresAt: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/extend`, { method: "POST", body: { expiresAt } });
  },
  async accept(id: string, candidateSignature: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/accept`, {
      method: "POST",
      body: { candidateSignature },
    });
  },
  async decline(id: string, reason: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/decline`, { method: "POST", body: { reason } });
  },
  async revise(id: string, payload: CreateOfferPayload): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/revise`, { method: "POST", body: payload });
  },
  async withdraw(id: string, reason: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/withdraw`, { method: "POST", body: { reason } });
  },
  async markExpired(id: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/expire`, { method: "POST" });
  },
  async sendReminder(id: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}/remind`, { method: "POST" });
  },
  async logNegotiation(
    id: string,
    payload: { proposedBy: NegotiationParty; proposedChangesJson?: string; notes?: string },
  ): Promise<OfferNegotiationDto> {
    return request<OfferNegotiationDto>(`/offers/${id}/negotiations`, {
      method: "POST",
      body: payload,
    });
  },
  async listNegotiations(id: string): Promise<OfferNegotiationDto[]> {
    return request<OfferNegotiationDto[]>(`/offers/${id}/negotiations`);
  },
  async getById(id: string): Promise<OfferDto> {
    return request<OfferDto>(`/offers/${id}`);
  },
  async forApplication(applicationId: string): Promise<OfferDto[]> {
    return request<OfferDto[]>(`/offers/by-application/${applicationId}`);
  },
  async byStatus(companyId: string, status: OfferStatus): Promise<OfferDto[]> {
    return request<OfferDto[]>(`/offers?companyId=${companyId}&status=${status}`);
  },
};

// ---- Offer Templates -----------------------------------------------------

export type OfferTemplateDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  bodyTemplate: string;
  defaultCurrency?: string;
  defaultNoticePeriodDays?: number;
  defaultProbationDays?: number;
  defaultExpiryDays: number;
  active: boolean;
  versionNo: number;
};

export type OfferTemplatePayload = {
  tenantId?: string;
  companyId?: string;
  code?: string;
  name: string;
  description?: string;
  bodyTemplate: string;
  defaultCurrency?: string;
  defaultNoticePeriodDays?: number;
  defaultProbationDays?: number;
  defaultExpiryDays?: number;
  active?: boolean;
};

export const offerTemplateApi = {
  async create(payload: OfferTemplatePayload): Promise<OfferTemplateDto> {
    return request<OfferTemplateDto>("/offers/templates", { method: "POST", body: payload });
  },
  async getById(id: string): Promise<OfferTemplateDto> {
    return request<OfferTemplateDto>(`/offers/templates/${id}`);
  },
  async listForCompany(companyId: string): Promise<OfferTemplateDto[]> {
    return request<OfferTemplateDto[]>(`/offers/templates?companyId=${companyId}`);
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/offers/templates/${id}`, { method: "DELETE" });
  },
};

// ---- Preboarding ---------------------------------------------------------

export type PreboardingChecklistStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "JOINED"
  | "NO_SHOW";
export const PREBOARDING_CHECKLIST_STATUSES: PreboardingChecklistStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "JOINED",
  "NO_SHOW",
];

export type PreboardingTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "WAITING_ON_CANDIDATE"
  | "WAITING_ON_COMPANY"
  | "COMPLETED"
  | "SKIPPED"
  | "FAILED";
export const PREBOARDING_TASK_STATUSES: PreboardingTaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING_ON_CANDIDATE",
  "WAITING_ON_COMPANY",
  "COMPLETED",
  "SKIPPED",
  "FAILED",
];

export type PreboardingTaskType =
  | "DOCUMENT_COLLECTION"
  | "ID_VERIFICATION"
  | "BACKGROUND_VERIFICATION"
  | "REFERENCE_CHECK"
  | "MEDICAL_CHECK"
  | "IT_ASSET"
  | "EMAIL_ACCOUNT"
  | "EMPLOYEE_ID"
  | "JOINING_KIT"
  | "JOINING_CONFIRMATION"
  | "OTHER";
export const PREBOARDING_TASK_TYPES: PreboardingTaskType[] = [
  "DOCUMENT_COLLECTION",
  "ID_VERIFICATION",
  "BACKGROUND_VERIFICATION",
  "REFERENCE_CHECK",
  "MEDICAL_CHECK",
  "IT_ASSET",
  "EMAIL_ACCOUNT",
  "EMPLOYEE_ID",
  "JOINING_KIT",
  "JOINING_CONFIRMATION",
  "OTHER",
];

export type PreboardingTaskOwner =
  | "HR"
  | "IT"
  | "ADMIN"
  | "HIRING_MANAGER"
  | "CANDIDATE"
  | "RECRUITER"
  | "VENDOR";
export const PREBOARDING_TASK_OWNERS: PreboardingTaskOwner[] = [
  "HR",
  "IT",
  "ADMIN",
  "HIRING_MANAGER",
  "CANDIDATE",
  "RECRUITER",
  "VENDOR",
];

export type PreboardingChecklistDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  offerId: string;
  applicationId?: string;
  candidateId?: string;
  joiningDate?: string;
  status: PreboardingChecklistStatus;
  completionPercent: number;
  joiningConfirmedAt?: string;
  joiningConfirmedBy?: string;
  employeeId?: string;
  notes?: string;
  versionNo: number;
};

export type PreboardingTaskInstanceDto = {
  id: string;
  checklistId: string;
  templateId?: string;
  name: string;
  taskType: PreboardingTaskType;
  owner: PreboardingTaskOwner;
  assignedEmployeeId?: string;
  mandatory: boolean;
  sortOrder: number;
  status: PreboardingTaskStatus;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  externalRef?: string;
  resultJson?: string;
  notes?: string;
  versionNo: number;
};

export const preboardingApi = {
  async createFromOffer(offerId: string): Promise<PreboardingChecklistDto> {
    return request<PreboardingChecklistDto>(`/preboarding/checklists/from-offer/${offerId}`, {
      method: "POST",
    });
  },
  async getChecklist(id: string): Promise<PreboardingChecklistDto> {
    return request<PreboardingChecklistDto>(`/preboarding/checklists/${id}`);
  },
  async listTasks(checklistId: string): Promise<PreboardingTaskInstanceDto[]> {
    return request<PreboardingTaskInstanceDto[]>(`/preboarding/checklists/${checklistId}/tasks`);
  },
  async remindTask(taskId: string): Promise<PreboardingTaskInstanceDto> {
    return request<PreboardingTaskInstanceDto>(`/preboarding/tasks/${taskId}/remind`, {
      method: "POST",
    });
  },
  async updateTaskStatus(
    taskId: string,
    payload: { status: PreboardingTaskStatus; notes?: string; resultJson?: string },
  ): Promise<PreboardingTaskInstanceDto> {
    return request<PreboardingTaskInstanceDto>(`/preboarding/tasks/${taskId}/status`, {
      method: "PUT",
      body: payload,
    });
  },
  async confirmJoining(
    checklistId: string,
    payload?: { employeeId?: string; notes?: string },
  ): Promise<PreboardingChecklistDto> {
    return request<PreboardingChecklistDto>(
      `/preboarding/checklists/${checklistId}/confirm-joining`,
      {
        method: "POST",
        body: payload,
      },
    );
  },
  /** Backend binds this endpoint's whole body to a bare string, not `{reason}`. */
  async markNoShow(checklistId: string, reason?: string): Promise<PreboardingChecklistDto> {
    return request<PreboardingChecklistDto>(`/preboarding/checklists/${checklistId}/no-show`, {
      method: "POST",
      body: reason,
    });
  },
  /** Backend binds this endpoint's whole body to a bare string, not `{reason}`. */
  async cancel(checklistId: string, reason?: string): Promise<PreboardingChecklistDto> {
    return request<PreboardingChecklistDto>(`/preboarding/checklists/${checklistId}/cancel`, {
      method: "POST",
      body: reason,
    });
  },
  async byStatus(
    companyId: string,
    status: PreboardingChecklistStatus,
  ): Promise<PreboardingChecklistDto[]> {
    return request<PreboardingChecklistDto[]>(
      `/preboarding/checklists?companyId=${companyId}&status=${status}`,
    );
  },
};

// ---- Preboarding Task Templates -----------------------------------------

export type PreboardingTaskTemplateDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  taskType: PreboardingTaskType;
  sortOrder: number;
  mandatory: boolean;
  defaultOwner: PreboardingTaskOwner;
  defaultSlaDays?: number;
  active: boolean;
  versionNo: number;
};

export type PreboardingTaskTemplatePayload = {
  tenantId?: string;
  companyId?: string;
  code?: string;
  name: string;
  description?: string;
  taskType: PreboardingTaskType;
  sortOrder?: number;
  mandatory?: boolean;
  defaultOwner?: PreboardingTaskOwner;
  defaultSlaDays?: number;
  active?: boolean;
};

export const preboardingTaskTemplateApi = {
  async create(payload: PreboardingTaskTemplatePayload): Promise<PreboardingTaskTemplateDto> {
    return request<PreboardingTaskTemplateDto>("/preboarding/task-templates", {
      method: "POST",
      body: payload,
    });
  },
  async listForCompany(companyId: string): Promise<PreboardingTaskTemplateDto[]> {
    return request<PreboardingTaskTemplateDto[]>(
      `/preboarding/task-templates?companyId=${companyId}`,
    );
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/preboarding/task-templates/${id}`, { method: "DELETE" });
  },
};

// ---- Onboarding (Sprint 23A/23B) ----------------------------------------
// com.ewos.onboarding — post-joining plans + tasks. Plans are normally
// materialised automatically by the preboarding-to-onboarding handoff
// listener when a checklist reaches JOINED; POST /plans below is HR's
// manual fallback. Every mutating endpoint requires ONBOARDING_WRITE/
// ONBOARDING_ADMIN server-side (see OnboardingPlanController /
// OnboardingTaskTemplateController) — the frontend gates match exactly.

export type OnboardingPlanStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export const ONBOARDING_PLAN_STATUSES: OnboardingPlanStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export type OnboardingTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "WAITING_ON_EMPLOYEE"
  | "WAITING_ON_COMPANY"
  | "COMPLETED"
  | "SKIPPED"
  | "FAILED";
export const ONBOARDING_TASK_STATUSES: OnboardingTaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING_ON_EMPLOYEE",
  "WAITING_ON_COMPANY",
  "COMPLETED",
  "SKIPPED",
  "FAILED",
];

export type OnboardingTaskType =
  | "ORIENTATION"
  | "DOCUMENT_UPLOAD"
  | "POLICY_ACKNOWLEDGEMENT"
  | "TRAINING"
  | "INTRODUCTION_MEETING"
  | "TEAM_INTRO"
  | "SYSTEM_ACCESS"
  | "WORKSTATION_SETUP"
  | "HANDBOOK"
  | "SURVEY"
  | "GOAL_SETTING"
  | "BUDDY_ASSIGNMENT"
  | "OTHER";
export const ONBOARDING_TASK_TYPES: OnboardingTaskType[] = [
  "ORIENTATION",
  "DOCUMENT_UPLOAD",
  "POLICY_ACKNOWLEDGEMENT",
  "TRAINING",
  "INTRODUCTION_MEETING",
  "TEAM_INTRO",
  "SYSTEM_ACCESS",
  "WORKSTATION_SETUP",
  "HANDBOOK",
  "SURVEY",
  "GOAL_SETTING",
  "BUDDY_ASSIGNMENT",
  "OTHER",
];

export type OnboardingTaskOwner =
  | "EMPLOYEE"
  | "MANAGER"
  | "BUDDY"
  | "HR"
  | "IT"
  | "ADMIN"
  | "OTHER";
export const ONBOARDING_TASK_OWNERS: OnboardingTaskOwner[] = [
  "EMPLOYEE",
  "MANAGER",
  "BUDDY",
  "HR",
  "IT",
  "ADMIN",
  "OTHER",
];

export type OnboardingPlanDto = {
  id: string;
  tenantId: string;
  companyId: string;
  employeeId: string;
  sourceOfferId?: string;
  sourceChecklistId?: string;
  joiningDate?: string;
  managerEmployeeId?: string;
  buddyEmployeeId?: string;
  status: OnboardingPlanStatus;
  completionPercent: number;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  versionNo: number;
};

export type OnboardingTaskInstanceDto = {
  id: string;
  planId: string;
  templateId?: string;
  name: string;
  taskType: OnboardingTaskType;
  owner: OnboardingTaskOwner;
  assignedEmployeeId?: string;
  mandatory: boolean;
  sortOrder: number;
  status: OnboardingTaskStatus;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  externalRef?: string;
  resultJson?: string;
  notes?: string;
  versionNo: number;
};

export type CreateOnboardingPlanPayload = {
  tenantId: string;
  companyId: string;
  employeeId: string;
  sourceOfferId?: string;
  sourceChecklistId?: string;
  joiningDate?: string;
  managerEmployeeId?: string;
  buddyEmployeeId?: string;
  notes?: string;
};

export type AssignOnboardingPlanRolesPayload = {
  managerEmployeeId?: string;
  buddyEmployeeId?: string;
};

export type AddOnboardingTaskPayload = {
  templateId?: string;
  name: string;
  taskType: OnboardingTaskType;
  owner?: OnboardingTaskOwner;
  assignedEmployeeId?: string;
  mandatory?: boolean;
  sortOrder?: number;
  dueDate?: string;
  notes?: string;
};

export type UpdateOnboardingTaskStatusPayload = {
  status: OnboardingTaskStatus;
  notes?: string;
  resultJson?: string;
};

export const onboardingPlanApi = {
  async create(payload: CreateOnboardingPlanPayload): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>("/onboarding/plans", { method: "POST", body: payload });
  },
  async getById(id: string): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>(`/onboarding/plans/${id}`);
  },
  async forEmployee(employeeId: string): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>(`/onboarding/plans/by-employee/${employeeId}`);
  },
  async byStatus(companyId: string, status: OnboardingPlanStatus): Promise<OnboardingPlanDto[]> {
    return request<OnboardingPlanDto[]>(
      `/onboarding/plans?companyId=${companyId}&status=${status}`,
    );
  },
  async start(id: string): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>(`/onboarding/plans/${id}/start`, { method: "POST" });
  },
  async complete(id: string): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>(`/onboarding/plans/${id}/complete`, { method: "POST" });
  },
  /** Backend binds this endpoint's whole body to a bare string, not `{reason}`. */
  async cancel(id: string, reason?: string): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>(`/onboarding/plans/${id}/cancel`, {
      method: "POST",
      body: reason,
    });
  },
  async assignRoles(
    id: string,
    payload: AssignOnboardingPlanRolesPayload,
  ): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>(`/onboarding/plans/${id}/roles`, {
      method: "PUT",
      body: payload,
    });
  },
  async addTask(
    planId: string,
    payload: AddOnboardingTaskPayload,
  ): Promise<OnboardingTaskInstanceDto> {
    return request<OnboardingTaskInstanceDto>(`/onboarding/plans/${planId}/tasks`, {
      method: "POST",
      body: payload,
    });
  },
  async listTasks(planId: string): Promise<OnboardingTaskInstanceDto[]> {
    return request<OnboardingTaskInstanceDto[]>(`/onboarding/plans/${planId}/tasks`);
  },
  async updateTaskStatus(
    taskId: string,
    payload: UpdateOnboardingTaskStatusPayload,
  ): Promise<OnboardingTaskInstanceDto> {
    return request<OnboardingTaskInstanceDto>(`/onboarding/tasks/${taskId}/status`, {
      method: "PUT",
      body: payload,
    });
  },
  async remindTask(taskId: string): Promise<OnboardingTaskInstanceDto> {
    return request<OnboardingTaskInstanceDto>(`/onboarding/tasks/${taskId}/remind`, {
      method: "POST",
    });
  },
  /** Sprint 23A — reassigns the employee responsible for a task; `undefined`/omitted clears it. */
  async reassignTask(
    taskId: string,
    assignedEmployeeId: string | undefined,
  ): Promise<OnboardingTaskInstanceDto> {
    return request<OnboardingTaskInstanceDto>(`/onboarding/tasks/${taskId}/assignee`, {
      method: "PUT",
      body: { assignedEmployeeId: assignedEmployeeId ?? null },
    });
  },
};

/** Sprint 23A — Employee Self-Service over Onboarding. Auth-only, no ONBOARDING_* permission. */
export const onboardingSelfServiceApi = {
  async myPlan(): Promise<OnboardingPlanDto> {
    return request<OnboardingPlanDto>("/onboarding/self-service/plan");
  },
  async myTasks(): Promise<OnboardingTaskInstanceDto[]> {
    return request<OnboardingTaskInstanceDto[]>("/onboarding/self-service/tasks");
  },
};

export type OnboardingDashboardDto = {
  plansPlanned: number;
  plansInProgress: number;
  plansCompleted: number;
  plansCancelled: number;
  byStatus: Array<{ status: string; count: number }>;
};

export type OnboardingReportRowDto = {
  planId: string;
  employeeId: string;
  joiningDate?: string;
  status: OnboardingPlanStatus;
  completionPercent: number;
  totalTasks: number;
  completedTasks: number;
  pendingMandatoryTasks: number;
};

export const onboardingDashboardApi = {
  async dashboard(companyId: string): Promise<OnboardingDashboardDto> {
    return request<OnboardingDashboardDto>(`/onboarding/dashboard?companyId=${companyId}`);
  },
  async reportByStatus(
    companyId: string,
    status: OnboardingPlanStatus,
  ): Promise<OnboardingReportRowDto[]> {
    return request<OnboardingReportRowDto[]>(
      `/onboarding/reports/by-status?companyId=${companyId}&status=${status}`,
    );
  },
};

// ---- Onboarding Task Templates -------------------------------------------

export type OnboardingTaskTemplateDto = ResourceRecord & {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  taskType: OnboardingTaskType;
  sortOrder: number;
  mandatory: boolean;
  defaultOwner: OnboardingTaskOwner;
  defaultSlaDays?: number;
  active: boolean;
  versionNo: number;
};

export type CreateOnboardingTaskTemplatePayload = {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  taskType: OnboardingTaskType;
  sortOrder?: number;
  mandatory?: boolean;
  defaultOwner?: OnboardingTaskOwner;
  defaultSlaDays?: number;
  active?: boolean;
};

export const onboardingTaskTemplateApi = {
  async create(payload: CreateOnboardingTaskTemplatePayload): Promise<OnboardingTaskTemplateDto> {
    return request<OnboardingTaskTemplateDto>("/onboarding/task-templates", {
      method: "POST",
      body: payload,
    });
  },
  async listForCompany(companyId: string): Promise<OnboardingTaskTemplateDto[]> {
    return request<OnboardingTaskTemplateDto[]>(
      `/onboarding/task-templates?companyId=${companyId}`,
    );
  },
  async remove(id: string): Promise<void> {
    await request<void>(`/onboarding/task-templates/${id}`, { method: "DELETE" });
  },
};
