/**
 * Mock data for workspace features (directory, team, holidays, announcements).
 * Sample data only — replace with backend responses when available.
 */

export type DirectoryPerson = {
  id: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  email: string;
  phone: string;
  initials: string;
  reportingTo?: string;
};

export const DIRECTORY: DirectoryPerson[] = [
  {
    id: "EMP-1001",
    name: "Rahul Menon",
    designation: "Senior Product Engineer",
    department: "Engineering",
    location: "Bengaluru HQ",
    email: "rahul.menon@ewos.example",
    phone: "+91 98765 43210",
    initials: "RM",
    reportingTo: "Priya Nair",
  },
  {
    id: "EMP-1002",
    name: "Priya Nair",
    designation: "Engineering Manager",
    department: "Engineering",
    location: "Bengaluru HQ",
    email: "priya.nair@ewos.example",
    phone: "+91 98765 43211",
    initials: "PN",
    reportingTo: "Aditya Rao",
  },
  {
    id: "EMP-1003",
    name: "Aditya Rao",
    designation: "VP Engineering",
    department: "Engineering",
    location: "Bengaluru HQ",
    email: "aditya.rao@ewos.example",
    phone: "+91 98765 43212",
    initials: "AR",
  },
  {
    id: "EMP-1004",
    name: "Sara Iyer",
    designation: "Product Designer",
    department: "Design",
    location: "Remote",
    email: "sara.iyer@ewos.example",
    phone: "+91 98765 43213",
    initials: "SI",
    reportingTo: "Priya Nair",
  },
  {
    id: "EMP-1005",
    name: "Neha Sharma",
    designation: "Finance Analyst",
    department: "Finance",
    location: "Mumbai",
    email: "neha.sharma@ewos.example",
    phone: "+91 98765 43214",
    initials: "NS",
  },
  {
    id: "EMP-1006",
    name: "Kabir Singh",
    designation: "Sales Lead",
    department: "Sales",
    location: "Delhi",
    email: "kabir.singh@ewos.example",
    phone: "+91 98765 43215",
    initials: "KS",
  },
  {
    id: "EMP-1007",
    name: "Aisha Khan",
    designation: "People Partner",
    department: "HR",
    location: "Bengaluru HQ",
    email: "aisha.khan@ewos.example",
    phone: "+91 98765 43216",
    initials: "AK",
  },
  {
    id: "EMP-1008",
    name: "Vikram Patel",
    designation: "DevOps Engineer",
    department: "Engineering",
    location: "Pune",
    email: "vikram.patel@ewos.example",
    phone: "+91 98765 43217",
    initials: "VP",
    reportingTo: "Priya Nair",
  },
  {
    id: "EMP-1009",
    name: "Meera Joshi",
    designation: "QA Engineer",
    department: "Engineering",
    location: "Bengaluru HQ",
    email: "meera.joshi@ewos.example",
    phone: "+91 98765 43218",
    initials: "MJ",
    reportingTo: "Priya Nair",
  },
  {
    id: "EMP-1010",
    name: "Rohan Das",
    designation: "Marketing Manager",
    department: "Marketing",
    location: "Mumbai",
    email: "rohan.das@ewos.example",
    phone: "+91 98765 43219",
    initials: "RD",
  },
];

export const MY_TEAM_IDS = ["EMP-1001", "EMP-1004", "EMP-1008", "EMP-1009"];
export const MY_MANAGER_ID = "EMP-1002";

export type Holiday = {
  date: string;
  name: string;
  type: "National" | "Regional" | "Optional" | "Company";
  location: string;
};

export const HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-26", name: "Republic Day", type: "National", location: "All India" },
  { date: "2026-03-06", name: "Holi", type: "National", location: "All India" },
  { date: "2026-04-14", name: "Ambedkar Jayanti", type: "National", location: "All India" },
  { date: "2026-05-01", name: "May Day", type: "Regional", location: "Selected states" },
  { date: "2026-07-15", name: "Independence Day", type: "National", location: "All India" },
  { date: "2026-08-30", name: "Ganesh Chaturthi", type: "Regional", location: "Maharashtra" },
  { date: "2026-10-02", name: "Gandhi Jayanti", type: "National", location: "All India" },
  { date: "2026-10-20", name: "Dussehra", type: "National", location: "All India" },
  { date: "2026-11-08", name: "Diwali", type: "National", location: "All India" },
  { date: "2026-12-25", name: "Christmas", type: "National", location: "All India" },
  { date: "2026-12-31", name: "EWOS Foundation Day", type: "Company", location: "All offices" },
];

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
