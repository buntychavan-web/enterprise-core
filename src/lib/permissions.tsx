import type { ReactNode } from "react";
import { useAuth } from "./auth-context";

/**
 * Reads the flattened permission-code Set derived from the JWT's
 * `authorities` claim (see jwt.ts / auth-context.tsx). UI convenience only —
 * every backend endpoint independently enforces @PreAuthorize on the actual
 * request, so this never needs to be treated as a security boundary.
 */
export function usePermissions(): { authorities: Set<string>; has: (code: string) => boolean } {
  const { authorities } = useAuth();
  return { authorities, has: (code: string) => authorities.has(code) };
}

export function RequirePermission({
  code,
  children,
  fallback = null,
}: {
  code: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { has } = usePermissions();
  return <>{has(code) ? children : fallback}</>;
}
