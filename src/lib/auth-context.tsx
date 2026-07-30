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
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
    const res = await authApi.login({ username, password });
    if (!res?.accessToken) {
      throw new Error("Login succeeded but no access token was returned by the server.");
    }
    tokenStore.set(res.accessToken, res.refreshToken, remember);

    const me = await authApi.me();
    sessionStore.set(me, remember);
    setUser(me);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await authApi.me();
    sessionStore.set(me);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
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
      refreshMe,
      logout,
    };
  }, [user, isInitializing, login, refreshMe, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
