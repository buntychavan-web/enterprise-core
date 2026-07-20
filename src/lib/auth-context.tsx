import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi, tokenStore, userStore, type UserDto } from "./api-client";

type AuthContextValue = {
  user: UserDto | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  loginAsDemo: (remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

export const DEMO_CREDENTIALS = { username: "demo", password: "demo1234" } as const;

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
    // Demo bypass: allow signing in with the built-in demo credentials when
    // the backend auth API isn't reachable in preview environments.
    if (
      username === DEMO_CREDENTIALS.username &&
      password === DEMO_CREDENTIALS.password
    ) {
      const demoUser: UserDto = {
        username: "demo",
        email: "demo@ewos.local",
        firstName: "Demo",
        lastName: "User",
        roles: ["ADMIN"],
      } as UserDto;
      tokenStore.set("demo-token", undefined, remember);
      userStore.set(demoUser, remember);
      setUser(demoUser);
      return;
    }

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

  const loginAsDemo = useCallback(
    async (remember = true) => {
      await login(DEMO_CREDENTIALS.username, DEMO_CREDENTIALS.password, remember);
    },
    [login],
  );

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
      loginAsDemo,
      logout,
    }),
    [user, isInitializing, login, loginAsDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
