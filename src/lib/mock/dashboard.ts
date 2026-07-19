/**
 * Mock dashboard datasets. Clearly labelled as sample data — replace with
 * real API responses once backend endpoints are available.
 */

export const HEADCOUNT_TREND = [
  { month: "Jan", headcount: 1180, hires: 22, exits: 8 },
  { month: "Feb", headcount: 1204, hires: 32, exits: 8 },
  { month: "Mar", headcount: 1232, hires: 35, exits: 7 },
  { month: "Apr", headcount: 1255, hires: 28, exits: 5 },
  { month: "May", headcount: 1288, hires: 40, exits: 7 },
  { month: "Jun", headcount: 1310, hires: 31, exits: 9 },
  { month: "Jul", headcount: 1342, hires: 42, exits: 10 },
];

export const DEPARTMENT_SPLIT = [
  { name: "Engineering", value: 412 },
  { name: "Sales", value: 265 },
  { name: "Operations", value: 198 },
  { name: "Finance", value: 84 },
  { name: "HR", value: 55 },
  { name: "Marketing", value: 92 },
];

export const PAYROLL_MONTHLY = [
  { month: "Jan", gross: 3.82, tax: 0.71, net: 2.94 },
  { month: "Feb", gross: 3.94, tax: 0.74, net: 3.02 },
  { month: "Mar", gross: 4.08, tax: 0.77, net: 3.11 },
  { month: "Apr", gross: 4.16, tax: 0.78, net: 3.18 },
  { month: "May", gross: 4.28, tax: 0.81, net: 3.26 },
  { month: "Jun", gross: 4.35, tax: 0.82, net: 3.32 },
  { month: "Jul", gross: 4.47, tax: 0.85, net: 3.41 },
];

export const ATTENDANCE_WEEK = [
  { day: "Mon", present: 1252, late: 43, absent: 47 },
  { day: "Tue", present: 1268, late: 31, absent: 43 },
  { day: "Wed", present: 1274, late: 28, absent: 40 },
  { day: "Thu", present: 1261, late: 35, absent: 46 },
  { day: "Fri", present: 1229, late: 52, absent: 61 },
];

export const RECENT_ACTIVITY: Array<{
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  tone: "info" | "success" | "warning" | "neutral";
}> = [
  {
    id: "a1",
    actor: "Priya Nair",
    action: "approved leave for",
    target: "Rahul Menon",
    at: "12 min ago",
    tone: "success",
  },
  {
    id: "a2",
    actor: "System",
    action: "generated payroll run for",
    target: "July 2026",
    at: "1 hr ago",
    tone: "info",
  },
  {
    id: "a3",
    actor: "Aditya Rao",
    action: "onboarded new employee",
    target: "Sara Iyer",
    at: "3 hr ago",
    tone: "success",
  },
  {
    id: "a4",
    actor: "Compliance bot",
    action: "flagged missing PAN for",
    target: "3 employees",
    at: "yesterday",
    tone: "warning",
  },
  {
    id: "a5",
    actor: "Neha Sharma",
    action: "updated cost centre",
    target: "CC-042",
    at: "yesterday",
    tone: "neutral",
  },
];

export const ANNOUNCEMENTS = [
  {
    id: "n1",
    title: "Q2 performance cycle opens Monday",
    body: "Managers must complete calibrations by August 15.",
  },
  {
    id: "n2",
    title: "New tax slabs effective Aug 1",
    body: "Payroll will apply revised slabs automatically.",
  },
  {
    id: "n3",
    title: "Wellness week — Aug 5-9",
    body: "Multiple sessions across all offices.",
  },
];
