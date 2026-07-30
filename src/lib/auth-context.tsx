import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  authApi,
  sessionStore,
  setUnauthorizedHandler,
  tokenStore,
  type MeResponse,
} from "./api-client";

type AuthContextValue = {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  /** Flattened authority/permission codes granted to the signed-in user. */
  permissions: string[];
  roles: string[];
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  /** Preview-only: signs in with a local demo session, no backend call. */
  loginAsDemo: () => Promise<void>;
  /** True when the active session is the local preview demo session. */
  isDemo: boolean;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Preview-only demo bypass. Lets reviewers click through the UI when the
 * Spring Boot backend is not reachable from the browser. No API call is made;
 * a local session is written to storage and revalidation is skipped.
 */
export const DEMO_CREDENTIALS = { username: "demo", password: "demo1234" } as const;
const DEMO_TOKEN = "demo.preview.token";

const DEMO_USER: MeResponse = {
  userId: "demo-user",
  username: DEMO_CREDENTIALS.username,
  email: "demo@ewos.local",
  tenantId: "demo-tenant",
  employeeId: "demo-employee",
  roles: [
    {
      id: "demo-role",
      name: "ADMIN",
      permissions: [
        "EMPLOYEE_READ",
        "EMPLOYEE_WRITE",
        "ORG_READ",
        "ORG_WRITE",
        "USER_READ",
        "USER_WRITE",
        "PAYROLL_READ",
        "PAYROLL_WRITE",
        "LEAVE_READ",
        "LEAVE_APPROVE",
        "ATTENDANCE_READ",
        "ATTENDANCE_APPROVE",
      ],
    },
  ],
};

function isDemoSession() {
  return tokenStore.get() === DEMO_TOKEN;
}

function roleNames(me: MeResponse | null): string[] {
  if (!me?.roles) return [];
  return me.roles.map((r) => (typeof r === "string" ? r : r.name)).filter(Boolean);
}

function permissionCodes(me: MeResponse | null): string[] {
  if (!me?.roles) return [];
  const out = new Set<string>();
  for (const role of me.roles) {
    if (typeof role === "string") continue;
    for (const p of role.permissions ?? []) out.add(p);
  }
  return [...out];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    const token = tokenStore.get();
    if (!token) {
      setIsInitializing(false);
      return;
    }
    // Show the cached identity immediately, then revalidate against the server.
    const cached = sessionStore.get();
    if (cached) setUser(cached);

    // Demo sessions are local-only: never revalidate against the backend.
    if (token === DEMO_TOKEN) {
      setUser(cached ?? DEMO_USER);
      setIsInitializing(false);
      return;
    }

    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        sessionStore.set(me);
        setUser(me);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    if (
      username.trim().toLowerCase() === DEMO_CREDENTIALS.username &&
      password === DEMO_CREDENTIALS.password
    ) {
      tokenStore.set(DEMO_TOKEN, undefined, remember);
      sessionStore.set(DEMO_USER, remember);
      setUser(DEMO_USER);
      return;
    }

    const res = await authApi.login({ username, password });
    if (!res?.accessToken) {
      throw new Error("Login succeeded but no access token was returned by the server.");
    }
    tokenStore.set(res.accessToken, res.refreshToken, remember);

    const me = await authApi.me();
    sessionStore.set(me, remember);
    setUser(me);
  }, []);

  const loginAsDemo = useCallback(async () => {
    tokenStore.set(DEMO_TOKEN, undefined, true);
    sessionStore.set(DEMO_USER, true);
    setUser(DEMO_USER);
  }, []);

  const refreshMe = useCallback(async () => {
    if (isDemoSession()) return;
    const me = await authApi.me();
    sessionStore.set(me);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    if (!isDemoSession()) {
      await authApi.logout();
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => {
    const roles = roleNames(user);
    const permissions = permissionCodes(user);
    return {
      user,
      isAuthenticated: !!user,
      isInitializing,
      roles,
      permissions,
      hasRole: (role) => roles.includes(role),
      hasPermission: (permission) => permissions.includes(permission),
      hasAnyPermission: (list) => list.some((p) => permissions.includes(p)),
      login,
      loginAsDemo,
      isDemo: !!user && user.userId === DEMO_USER.userId,
      refreshMe,
      logout,
    };
  }, [user, isInitializing, login, loginAsDemo, refreshMe, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
