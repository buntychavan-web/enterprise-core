// Test-only stand-in for recharts, aliased in vitest.config.ts.
//
// recharts pulls in a large d3/victory-vendor dependency graph that Vite's
// dependency optimizer tries to pre-bundle as soon as it sees the static
// `import ... from "recharts"` in _app.dashboard.tsx — before a runtime
// `vi.mock("recharts", ...)` ever gets a chance to intercept it. That scan
// hangs in this environment, so component tests alias the specifier itself
// to this lightweight stub instead, and never touch the real package.
import type { ReactNode } from "react";

function Passthrough({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export const Area = Passthrough;
export const AreaChart = Passthrough;
export const Bar = Passthrough;
export const BarChart = Passthrough;
export const CartesianGrid = Passthrough;
export const Cell = Passthrough;
export const Line = Passthrough;
export const LineChart = Passthrough;
export const Pie = Passthrough;
export const PieChart = Passthrough;
export const ResponsiveContainer = Passthrough;
export const Tooltip = Passthrough;
export const XAxis = Passthrough;
export const YAxis = Passthrough;
