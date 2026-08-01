/**
 * Recruitment API client — contracts derived from the EWOS Spring Boot backend
 * (`com.ewos.recruitment`, migration V21, Sprint 22A).
 *
 *   /api/v1/recruitment/positions      — job position catalogue (CRUD)
 *   /api/v1/recruitment/requisitions   — requisition lifecycle
 *
 * Permissions: RECRUITMENT_READ / RECRUITMENT_WRITE / RECRUITMENT_APPROVE /
 * RECRUITMENT_ADMIN. All calls send `X-Tenant-Id` via the shared request layer.
 */

import { request, type ResourceRecord } from "@/lib/api-client";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERN",
  "CONSULTANT",
] as const;
export type RecruitmentEmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const REQUISITION_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type RequisitionPriority = (typeof REQUISITION_PRIORITIES)[number];

export const REQUISITION_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "OPEN",
  "ON_HOLD",
  "FILLED",
  "REJECTED",
  "CLOSED",
  "CANCELLED",
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

/** Columns of the hiring pipeline board, in lifecycle order. */
export const PIPELINE_STAGES: RequisitionStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "OPEN",
  "ON_HOLD",
  "FILLED",
];

/* -------------------------------------------------------------------------- */
/* DTOs                                                                       */
/* -------------------------------------------------------------------------- */

export type JobPositionResponse = {
  id: string;
  tenantId?: string;
  companyId?: string;
  code: string;
  title: string;
  description?: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType?: RecruitmentEmploymentType;
  grade?: string;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  active?: boolean;
  versionNo?: number;
};

export type JobRequisitionResponse = {
  id: string;
  tenantId?: string;
  companyId?: string;
  requisitionNumber: string;
  jobPositionId?: string;
  title: string;
  departmentOrgUnitId?: string;
  location?: string;
  employmentType?: RecruitmentEmploymentType;
  headcount: number;
  filledCount: number;
  priority?: RequisitionPriority;
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
  versionNo?: number;
};

export type CreateJobPositionPayload = {
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
  active?: boolean;
};

export type UpdateJobPositionPayload = Omit<
  CreateJobPositionPayload,
  "tenantId" | "companyId" | "code"
>;

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

/* -------------------------------------------------------------------------- */
/* Clients                                                                    */
/* -------------------------------------------------------------------------- */

const POSITIONS = "/recruitment/positions";
const REQUISITIONS = "/recruitment/requisitions";

export const jobPositionsApi = {
  list(companyId: string, signal?: AbortSignal) {
    return request<JobPositionResponse[]>(POSITIONS, { params: { companyId }, signal }).then((d) =>
      Array.isArray(d) ? d : [],
    );
  },
  get(id: string, signal?: AbortSignal) {
    return request<JobPositionResponse>(`${POSITIONS}/${id}`, { signal });
  },
  create(body: CreateJobPositionPayload) {
    return request<JobPositionResponse>(POSITIONS, { method: "POST", body });
  },
  update(id: string, body: UpdateJobPositionPayload) {
    return request<JobPositionResponse>(`${POSITIONS}/${id}`, { method: "PUT", body });
  },
  remove(id: string) {
    return request<void>(`${POSITIONS}/${id}`, { method: "DELETE" });
  },
};

export const jobRequisitionsApi = {
  byStatus(companyId: string, status: RequisitionStatus, signal?: AbortSignal) {
    return request<JobRequisitionResponse[]>(REQUISITIONS, {
      params: { companyId, status },
      signal,
    }).then((d) => (Array.isArray(d) ? d : []));
  },
  /**
   * The backend only exposes list-by-status, so the board and dashboard fan out
   * one request per lifecycle state and merge the results.
   */
  async all(
    companyId: string,
    statuses: RequisitionStatus[] = [...REQUISITION_STATUSES],
    signal?: AbortSignal,
  ) {
    const pages = await Promise.all(
      statuses.map((s) => jobRequisitionsApi.byStatus(companyId, s, signal)),
    );
    return pages.flat();
  },
  get(id: string, signal?: AbortSignal) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}`, { signal });
  },
  create(body: CreateJobRequisitionPayload) {
    return request<JobRequisitionResponse>(REQUISITIONS, { method: "POST", body });
  },
  update(id: string, body: UpdateJobRequisitionPayload) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}`, { method: "PUT", body });
  },
  submit(id: string, workflowDefinitionId: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/submit`, {
      method: "POST",
      body: { workflowDefinitionId },
    });
  },
  approve(id: string, notes?: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/approve`, {
      method: "POST",
      body: { notes: notes ?? null },
    });
  },
  reject(id: string, notes?: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/reject`, {
      method: "POST",
      body: { notes: notes ?? null },
    });
  },
  open(id: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/open`, { method: "POST" });
  },
  hold(id: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/hold`, { method: "POST" });
  },
  resume(id: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/resume`, { method: "POST" });
  },
  fill(id: string, fills: number) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/fill`, {
      method: "POST",
      body: { fills },
    });
  },
  close(id: string, reason: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/close`, {
      method: "POST",
      body: { reason },
    });
  },
  cancel(id: string, reason: string) {
    return request<JobRequisitionResponse>(`${REQUISITIONS}/${id}/cancel`, {
      method: "POST",
      body: { reason },
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

export function requisitionStatusTone(status?: RequisitionStatus) {
  switch (status) {
    case "OPEN":
    case "APPROVED":
    case "FILLED":
      return "success" as const;
    case "PENDING_APPROVAL":
      return "info" as const;
    case "ON_HOLD":
      return "warning" as const;
    case "REJECTED":
    case "CANCELLED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

/** Lifecycle guards mirroring backend `RequisitionPolicy`. */
export const requisitionActions = {
  editable: (s: RequisitionStatus) => s === "DRAFT",
  submittable: (s: RequisitionStatus) => s === "DRAFT",
  decidable: (s: RequisitionStatus) => s === "PENDING_APPROVAL",
  openable: (s: RequisitionStatus) => s === "APPROVED",
  holdable: (s: RequisitionStatus) => s === "OPEN",
  resumable: (s: RequisitionStatus) => s === "ON_HOLD",
  fillable: (s: RequisitionStatus) => s === "OPEN",
  closeable: (s: RequisitionStatus) => ["OPEN", "ON_HOLD", "FILLED", "APPROVED"].includes(s),
  cancellable: (s: RequisitionStatus) => !["FILLED", "CLOSED", "CANCELLED", "REJECTED"].includes(s),
};

export type RecruitmentRecord = ResourceRecord;

/* -------------------------------------------------------------------------- */
/* Workflow definitions (submit-for-approval target)                          */
/* -------------------------------------------------------------------------- */

export type WorkflowDefinitionSummary = {
  id: string;
  code?: string;
  name?: string;
  subjectType?: string;
  active?: boolean;
  definitionVersion?: number;
};

export const REQUISITION_SUBJECT_TYPE = "recruitment.requisition";

export const recruitmentWorkflowApi = {
  /** Active definitions bound to the requisition subject type. */
  async definitions(signal?: AbortSignal) {
    const all = await request<WorkflowDefinitionSummary[]>("/workflow/definitions", { signal });
    return (Array.isArray(all) ? all : []).filter(
      (d) => d.active !== false && d.subjectType === REQUISITION_SUBJECT_TYPE,
    );
  },
};
