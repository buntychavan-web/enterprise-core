/**
 * Static help content for the Help Center and keyboard shortcuts.
 * These are product-documentation strings, not business data, so they are
 * kept in the frontend. Holiday and announcement data have been moved to
 * real backend API clients in src/lib/api-client.ts.
 */

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
