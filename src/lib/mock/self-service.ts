/**
 * Mock data for self-service modules (Attendance, Leave, Payslips,
 * Notifications). Sample data only — swap for real backend responses when
 * corresponding endpoints ship.
 */

export type AttendanceEntry = {
  date: string;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number;
  status: "Present" | "Late" | "Absent" | "Weekend" | "Holiday" | "Leave";
  note?: string;
};

export const ATTENDANCE_MONTH: AttendanceEntry[] = [
  {
    date: "2026-07-01",
    day: "Wed",
    checkIn: "09:05",
    checkOut: "18:22",
    hours: 9.28,
    status: "Present",
  },
  {
    date: "2026-07-02",
    day: "Thu",
    checkIn: "09:41",
    checkOut: "18:35",
    hours: 8.9,
    status: "Late",
    note: "Traffic",
  },
  {
    date: "2026-07-03",
    day: "Fri",
    checkIn: "09:02",
    checkOut: "17:58",
    hours: 8.93,
    status: "Present",
  },
  { date: "2026-07-04", day: "Sat", checkIn: null, checkOut: null, hours: 0, status: "Weekend" },
  { date: "2026-07-05", day: "Sun", checkIn: null, checkOut: null, hours: 0, status: "Weekend" },
  {
    date: "2026-07-06",
    day: "Mon",
    checkIn: "08:55",
    checkOut: "18:10",
    hours: 9.25,
    status: "Present",
  },
  {
    date: "2026-07-07",
    day: "Tue",
    checkIn: null,
    checkOut: null,
    hours: 0,
    status: "Leave",
    note: "Casual Leave",
  },
  {
    date: "2026-07-08",
    day: "Wed",
    checkIn: "09:12",
    checkOut: "18:45",
    hours: 9.55,
    status: "Present",
  },
  {
    date: "2026-07-09",
    day: "Thu",
    checkIn: "09:22",
    checkOut: "18:20",
    hours: 8.97,
    status: "Present",
  },
  {
    date: "2026-07-10",
    day: "Fri",
    checkIn: "09:35",
    checkOut: "18:30",
    hours: 8.92,
    status: "Late",
  },
  {
    date: "2026-07-13",
    day: "Mon",
    checkIn: "09:01",
    checkOut: "18:15",
    hours: 9.23,
    status: "Present",
  },
  {
    date: "2026-07-14",
    day: "Tue",
    checkIn: "08:58",
    checkOut: "18:05",
    hours: 9.12,
    status: "Present",
  },
  {
    date: "2026-07-15",
    day: "Wed",
    checkIn: null,
    checkOut: null,
    hours: 0,
    status: "Holiday",
    note: "Independence Day",
  },
  {
    date: "2026-07-16",
    day: "Thu",
    checkIn: "09:10",
    checkOut: "18:40",
    hours: 9.5,
    status: "Present",
  },
  {
    date: "2026-07-17",
    day: "Fri",
    checkIn: "09:20",
    checkOut: "18:25",
    hours: 9.08,
    status: "Present",
  },
];

export type LeaveBalance = {
  type: string;
  entitled: number;
  used: number;
  pending: number;
  balance: number;
};

export const LEAVE_BALANCES: LeaveBalance[] = [
  { type: "Casual Leave", entitled: 12, used: 4, pending: 1, balance: 7 },
  { type: "Sick Leave", entitled: 10, used: 2, pending: 0, balance: 8 },
  { type: "Earned Leave", entitled: 24, used: 6, pending: 2, balance: 16 },
  { type: "Comp Off", entitled: 4, used: 1, pending: 0, balance: 3 },
];

export type LeaveRequest = {
  id: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Approved" | "Pending" | "Rejected";
  approver: string;
  appliedOn: string;
};

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "LR-2041",
    type: "Casual Leave",
    from: "2026-07-07",
    to: "2026-07-07",
    days: 1,
    reason: "Personal work",
    status: "Approved",
    approver: "Priya Nair",
    appliedOn: "2026-07-04",
  },
  {
    id: "LR-2058",
    type: "Earned Leave",
    from: "2026-08-10",
    to: "2026-08-14",
    days: 5,
    reason: "Family vacation",
    status: "Pending",
    approver: "Priya Nair",
    appliedOn: "2026-07-18",
  },
  {
    id: "LR-2019",
    type: "Sick Leave",
    from: "2026-06-12",
    to: "2026-06-13",
    days: 2,
    reason: "Flu",
    status: "Approved",
    approver: "Priya Nair",
    appliedOn: "2026-06-11",
  },
  {
    id: "LR-1998",
    type: "Casual Leave",
    from: "2026-05-30",
    to: "2026-05-30",
    days: 1,
    reason: "Bank work",
    status: "Rejected",
    approver: "Priya Nair",
    appliedOn: "2026-05-28",
  },
];

export type Payslip = {
  id: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
  status: "Paid" | "Processed" | "Pending";
  paidOn?: string;
};

export const PAYSLIPS: Payslip[] = [
  {
    id: "PS-202607",
    period: "July 2026",
    gross: 165000,
    deductions: 32500,
    net: 132500,
    status: "Processed",
  },
  {
    id: "PS-202606",
    period: "June 2026",
    gross: 165000,
    deductions: 32500,
    net: 132500,
    status: "Paid",
    paidOn: "2026-06-30",
  },
  {
    id: "PS-202605",
    period: "May 2026",
    gross: 165000,
    deductions: 32500,
    net: 132500,
    status: "Paid",
    paidOn: "2026-05-31",
  },
  {
    id: "PS-202604",
    period: "April 2026",
    gross: 158000,
    deductions: 30800,
    net: 127200,
    status: "Paid",
    paidOn: "2026-04-30",
  },
  {
    id: "PS-202603",
    period: "March 2026",
    gross: 158000,
    deductions: 30800,
    net: 127200,
    status: "Paid",
    paidOn: "2026-03-31",
  },
  {
    id: "PS-202602",
    period: "February 2026",
    gross: 158000,
    deductions: 30800,
    net: 127200,
    status: "Paid",
    paidOn: "2026-02-28",
  },
];

export type AppNotification = {
  id: string;
  category: "Payroll" | "Leave" | "System" | "HR" | "Compliance";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  tone: "info" | "success" | "warning" | "neutral";
};

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "N-001",
    category: "Payroll",
    title: "July payslip is ready",
    body: "Your payslip for July 2026 is available for download.",
    createdAt: "2 hrs ago",
    read: false,
    tone: "success",
  },
  {
    id: "N-002",
    category: "Leave",
    title: "Leave request pending approval",
    body: "Your leave (Aug 10–14) is awaiting Priya Nair's approval.",
    createdAt: "5 hrs ago",
    read: false,
    tone: "info",
  },
  {
    id: "N-003",
    category: "Compliance",
    title: "Update investment declaration",
    body: "FY 2026-27 declarations close on Aug 31.",
    createdAt: "yesterday",
    read: false,
    tone: "warning",
  },
  {
    id: "N-004",
    category: "HR",
    title: "Performance review opens Monday",
    body: "Complete self-appraisal before Aug 15.",
    createdAt: "2 days ago",
    read: true,
    tone: "info",
  },
  {
    id: "N-005",
    category: "System",
    title: "Password will expire in 7 days",
    body: "Change it from Settings → Security to avoid interruption.",
    createdAt: "3 days ago",
    read: true,
    tone: "warning",
  },
  {
    id: "N-006",
    category: "Payroll",
    title: "Tax slabs updated",
    body: "Revised tax slabs will apply from August payroll.",
    createdAt: "5 days ago",
    read: true,
    tone: "neutral",
  },
];
