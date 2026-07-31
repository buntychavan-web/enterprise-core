import { useAuth } from "@/lib/auth-context";

/**
 * RBAC for the recruitment module, mirroring the backend @PreAuthorize codes.
 * Tenant administrators inherit every capability.
 */
export function useRecruitmentAccess() {
  const { hasPermission, roles } = useAuth();
  const isAdmin = roles.some((r) => /^(ADMIN|SUPER_ADMIN|TENANT_ADMIN|HR_ADMIN)$/i.test(r));

  return {
    canRead: isAdmin || hasPermission("RECRUITMENT_READ"),
    canWrite: isAdmin || hasPermission("RECRUITMENT_WRITE"),
    canApprove: isAdmin || hasPermission("RECRUITMENT_APPROVE"),
    canAdmin: isAdmin || hasPermission("RECRUITMENT_ADMIN"),
  };
}
