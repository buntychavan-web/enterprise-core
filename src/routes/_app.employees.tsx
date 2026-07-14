import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ewos/ModulePlaceholder";

export const Route = createFileRoute("/_app/employees")({
  head: () => ({
    meta: [{ title: "Employees — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ModulePlaceholder
      title="Employees"
      description="Employee records, positions, and reporting lines will appear here."
    />
  ),
});
