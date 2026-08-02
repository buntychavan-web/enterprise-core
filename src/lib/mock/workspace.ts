/**
 * Mock data for workspace features (team, announcements, help, shortcuts).
 * Sample data only — replace with backend responses when available.
 *
 * Sprint 24F — the Directory and Holidays screens that used to read mock data from this file
 * (DirectoryPerson/DIRECTORY, Holiday/HOLIDAYS_2026) have been removed: Directory now reads real
 * employees from GET /api/v1/employees (see _app.directory.tsx), and Holidays had no backend
 * concept at all (no Holiday domain/entity anywhere in com.ewos.organization or com.ewos.leave)
 * so the route was removed rather than continuing to ship fabricated data as if it were real.
 */

export const MY_TEAM_IDS = ["EMP-1001", "EMP-1004", "EMP-1008", "EMP-1009"];
export const MY_MANAGER_ID = "EMP-1002";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: "Company" | "HR" | "Product" | "Policy";
  publishedAt: string;
  author: string;
  pinned?: boolean;
};

export const ANNOUNCEMENTS_FULL: Announcement[] = [
  {
    id: "AN-101",
    title: "Q2 performance cycle opens Monday",
    body: "Managers must complete calibrations by August 15. Self-appraisals open in Performance module.",
    category: "HR",
    publishedAt: "2026-07-18",
    author: "People Team",
    pinned: true,
  },
  {
    id: "AN-100",
    title: "New tax slabs effective Aug 1",
    body: "Payroll will automatically apply revised tax slabs. Review your investment declarations before July 31.",
    category: "Policy",
    publishedAt: "2026-07-15",
    author: "Finance",
  },
  {
    id: "AN-099",
    title: "Wellness week — Aug 5-9",
    body: "Sessions across all offices. Sign-ups open in the Learning module.",
    category: "Company",
    publishedAt: "2026-07-10",
    author: "Culture Team",
  },
  {
    id: "AN-098",
    title: "EWOS v2.4 released",
    body: "New attendance geo-fencing, faster payroll runs, redesigned dashboards.",
    category: "Product",
    publishedAt: "2026-07-01",
    author: "Product",
  },
  {
    id: "AN-097",
    title: "Updated leave policy",
    body: "Earned Leave carry-forward increased to 30 days effective FY 2026-27.",
    category: "Policy",
    publishedAt: "2026-06-20",
    author: "People Team",
  },
];

export type HelpTopic = { q: string; a: string };
export const HELP_TOPICS: Array<{ section: string; items: HelpTopic[] }> = [
  {
    section: "Getting started",
    items: [
      {
        q: "How do I update my profile?",
        a: "Open Profile from the top-right menu and edit any field. Contact HR for locked fields such as PAN and date of joining.",
      },
      {
        q: "How do I switch companies?",
        a: "Use the company switcher in the top-left of the header. Available companies depend on your role.",
      },
      {
        q: "How do I switch themes?",
        a: "Use the theme toggle in the header, or open Settings → Appearance to pick Light, Dark or System.",
      },
    ],
  },
  {
    section: "Attendance & leave",
    items: [
      {
        q: "How do I apply for leave?",
        a: "Navigate to Leave and use Apply for leave. Your manager receives an approval notification.",
      },
      {
        q: "Why is my punch missing?",
        a: "Punches sync from the biometric device every 15 minutes. If missing after an hour, raise a regularization request.",
      },
    ],
  },
  {
    section: "Payroll",
    items: [
      {
        q: "Where can I download my payslip?",
        a: "Payslips → select the month → Download PDF. Payslips are emailed on the last working day.",
      },
      {
        q: "How do I update my bank account?",
        a: "Profile → Bank. Changes require HR verification before the next payroll cut-off.",
      },
    ],
  },
];

export type Shortcut = { keys: string[]; description: string };
export const SHORTCUTS: Array<{ group: string; items: Shortcut[] }> = [
  {
    group: "Global",
    items: [
      { keys: ["⌘", "K"], description: "Open command palette / global search" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close dialogs, drawers and menus" },
    ],
  },
  {
    group: "Navigation",
    items: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "E"], description: "Go to Employees" },
      { keys: ["G", "A"], description: "Go to Attendance" },
      { keys: ["G", "L"], description: "Go to Leave" },
      { keys: ["G", "P"], description: "Go to Payslips" },
    ],
  },
  {
    group: "Actions",
    items: [
      { keys: ["N"], description: "New record (context-aware)" },
      { keys: ["/"], description: "Focus search on the current page" },
      { keys: ["R"], description: "Refresh current view" },
    ],
  },
];
