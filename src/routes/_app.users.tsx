import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/ewos/ModulePlaceholder";

export const Route = createFileRoute("/_app/users")({
  head: () => ({
    meta: [{ title: "Users — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ModulePlaceholder
      title="Users"
      description="User accounts, roles, and access management will appear here."
    />
  ),
});
