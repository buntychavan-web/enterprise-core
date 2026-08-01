import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import type {
  AppraisalCycleLaunchBatchStatus,
  AppraisalStatus,
  CalibrationSessionStatus,
  PerformanceCycleStatus,
} from "@/lib/api-client";

const CYCLE_STATUS_TONE: Record<PerformanceCycleStatus, StatusTone> = {
  DRAFT: "neutral",
  OPEN: "info",
  SELF_REVIEW: "info",
  MANAGER_REVIEW: "info",
  REVIEWER_REVIEW: "info",
  CALIBRATION: "warning",
  HR_REVIEW: "warning",
  FINAL_APPROVAL: "warning",
  RELEASED: "success",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

export function CycleStatusChip({ status }: { status: PerformanceCycleStatus }) {
  return <StatusChip tone={CYCLE_STATUS_TONE[status]}>{status.replace(/_/g, " ")}</StatusChip>;
}

const APPRAISAL_STATUS_TONE: Record<AppraisalStatus, StatusTone> = {
  PENDING_SELF: "neutral",
  PENDING_MANAGER: "info",
  PENDING_REVIEWER: "info",
  CALIBRATION: "warning",
  PENDING_APPROVAL: "warning",
  FINALISED: "success",
  CANCELLED: "danger",
};

export function AppraisalStatusChip({ status }: { status: AppraisalStatus }) {
  return <StatusChip tone={APPRAISAL_STATUS_TONE[status]}>{status.replace(/_/g, " ")}</StatusChip>;
}

const LAUNCH_BATCH_STATUS_TONE: Record<AppraisalCycleLaunchBatchStatus, StatusTone> = {
  PENDING: "neutral",
  RUNNING: "info",
  COMPLETED: "success",
  PARTIALLY_COMPLETED: "warning",
  FAILED: "danger",
};

export function LaunchBatchStatusChip({ status }: { status: AppraisalCycleLaunchBatchStatus }) {
  return (
    <StatusChip tone={LAUNCH_BATCH_STATUS_TONE[status]}>{status.replace(/_/g, " ")}</StatusChip>
  );
}

const CALIBRATION_SESSION_STATUS_TONE: Record<CalibrationSessionStatus, StatusTone> = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function CalibrationSessionStatusChip({ status }: { status: CalibrationSessionStatus }) {
  return (
    <StatusChip tone={CALIBRATION_SESSION_STATUS_TONE[status]}>
      {status.replace(/_/g, " ")}
    </StatusChip>
  );
}
