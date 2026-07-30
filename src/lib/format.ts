import type { LeaveRequestStatus, TimesheetStatus } from "@/lib/api-client";
import type { StatusTone } from "@/components/ewos/StatusChip";

/** Maps backend enum values to display labels + tones. */
export function requestStatusTone(status?: string): StatusTone {
  switch (status) {
    case "APPROVED":
      return "success";
    case "SUBMITTED":
      return "info";
    case "REJECTED":
      return "danger";
    case "CANCELLED":
      return "neutral";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
  }
}

export function humanizeEnum(value?: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMoney(amount?: number | null, currency?: string): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toLocaleString();
  }
}

export function formatNumber(value?: number | null, suffix = ""): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString()}${suffix}`;
}

export type { LeaveRequestStatus, TimesheetStatus };
