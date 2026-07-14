import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ewos/ModulePlaceholder";

export const Route = createFileRoute("/_app/organization")({
  head: () => ({
    meta: [{ title: "Organization — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ModulePlaceholder
      title="Organization"
      description="Departments, locations, and organizational structure will appear here."
    />
  ),
});
