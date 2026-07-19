import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi, tokenStore, userStore, type UserDto } from "./api-client";

type AuthContextValue = {
  user: UserDto | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    const cached = userStore.get();
    if (token && cached) setUser(cached);
    setIsInitializing(false);
  }, []);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    const res = await authApi.login({ username, password });
    const token = res.accessToken ?? res.token;
    if (!token) {
      throw new Error("Login succeeded but no access token was returned by the server.");
    }
    tokenStore.set(token, res.refreshToken, remember);

    let nextUser: UserDto | null = res.user ?? null;
    if (!nextUser) {
      nextUser = await authApi.me();
    }
    if (!nextUser) {
      nextUser = { username };
    }
    userStore.set(nextUser, remember);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitializing,
      login,
      logout,
    }),
    [user, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
