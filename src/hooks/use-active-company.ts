import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { companiesApi } from "@/lib/api-client";

const STORAGE_KEY = "ewos.activeCompanyId";

export type CompanyOption = { id: string; name: string };

/**
 * Resolves the company scope required by tenant-scoped endpoints that take a
 * `companyId` query parameter (recruitment positions / requisitions).
 * The selection is remembered locally; the first company is used by default.
 */
export function useActiveCompany() {
  const query = useQuery({
    queryKey: ["companies", "options"],
    queryFn: ({ signal }) => companiesApi.list({ page: 0, size: 200 }, signal),
    staleTime: 5 * 60_000,
  });

  const companies = useMemo<CompanyOption[]>(() => {
    const rows = query.data?.content ?? [];
    return rows
      .map((r) => ({
        id: String(r.id ?? ""),
        name: String(r.name ?? r.code ?? r.legalName ?? r.id ?? "Company"),
      }))
      .filter((c) => c.id);
  }, [query.data]);

  const [selected, setSelected] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  });

  useEffect(() => {
    if (!companies.length) return;
    if (selected && companies.some((c) => c.id === selected)) return;
    setSelected(companies[0].id);
  }, [companies, selected]);

  useEffect(() => {
    if (selected && typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, selected);
  }, [selected]);

  return {
    companies,
    companyId: companies.length ? (selected ?? companies[0].id) : undefined,
    setCompanyId: setSelected,
    isLoading: query.isLoading,
    error: query.error,
  };
}
