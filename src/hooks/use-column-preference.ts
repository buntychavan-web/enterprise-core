import { useCallback, useEffect, useState } from "react";

/**
 * Persists a per-screen column selection in localStorage so the choice
 * survives reloads, like the column chooser in Workday/SuccessFactors grids.
 */
export function useColumnPreference(storageKey: string, defaults: string[]) {
  const [visible, setVisible] = useState<string[]>(defaults);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`ewos.columns.${storageKey}`);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
        setVisible(parsed);
      }
    } catch {
      /* corrupted preference — fall back to defaults */
    }
  }, [storageKey]);

  const update = useCallback(
    (next: string[]) => {
      setVisible(next);
      try {
        window.localStorage.setItem(`ewos.columns.${storageKey}`, JSON.stringify(next));
      } catch {
        /* storage unavailable (private mode) — keep the in-memory choice */
      }
    },
    [storageKey],
  );

  const isVisible = useCallback((key: string) => visible.includes(key), [visible]);

  return { visible, setVisible: update, isVisible };
}
