import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { resourceApi, type ResourceApiOptions, type ResourceRecord } from "./api-client";
import { useAuth } from "./auth-context";

// Sprint 2.1 — lifted out of _app.tsx's local state so sibling routes
// (Employees, Organization, ...) can consume the caller's tenant and active
// company without each re-deriving it. GET /api/v1/companies is already
// Chinese-Wall filtered server-side (com.ewos.tenancy) to the companies
// under the caller's accessible clients.
type CompanyRow = ResourceRecord & { name?: string };
const companiesApi = resourceApi<CompanyRow>("/companies");
const ACTIVE_COMPANY_KEY = "ewos.activeCompanyId";

type Company = { id: string; name: string };

type TenantContextValue = {
  tenantId: string | undefined;
  companies: Company[];
  activeCompanyId: string | undefined;
  selectCompany: (id: string) => void;
  /** Stable per-render apiOptions for the active tenant/company — pass directly
   *  to CrudScreen/resourceApi so its memoization doesn't thrash. */
  apiOptions: ResourceApiOptions;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const tenantId = user?.tenantId;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | undefined>(
    () => localStorage.getItem(ACTIVE_COMPANY_KEY) ?? undefined,
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    companiesApi.list().then((res) => {
      if (cancelled || res.unavailable) return;
      const list = res.items.map((c) => ({ id: String(c.id), name: c.name ?? String(c.id) }));
      setCompanies(list);
      setActiveCompanyId((current) =>
        current && list.some((c) => c.id === current) ? current : list[0]?.id,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const selectCompany = useCallback((id: string) => {
    setActiveCompanyId(id);
    localStorage.setItem(ACTIVE_COMPANY_KEY, id);
  }, []);

  const apiOptions = useMemo<ResourceApiOptions>(
    () => ({
      extraQuery: tenantId ? { tenantId } : undefined,
      extraBody: {
        ...(tenantId ? { tenantId } : {}),
        ...(activeCompanyId ? { companyId: activeCompanyId } : {}),
      },
    }),
    [tenantId, activeCompanyId],
  );

  const value = useMemo<TenantContextValue>(
    () => ({ tenantId, companies, activeCompanyId, selectCompany, apiOptions }),
    [tenantId, companies, activeCompanyId, selectCompany, apiOptions],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
}
