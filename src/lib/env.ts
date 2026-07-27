import { isFeatureEnabled } from "./feature-flags";

/**
 * Demo Login gating (Sprint 2.1, Product Owner Decision 1):
 * enabled only when VITE_ENABLE_DEMO_LOGIN=true is set at build time, so it
 * can be turned on for Development/Test builds and must be left unset (or
 * false) for Production. The vite.config.ts build guard additionally fails
 * a `mode: production` build outright if this flag is set, so a Production
 * deploy cannot ship with demo mode on even by accident.
 */
export const isDemoLoginEnabled = isFeatureEnabled("demoLogin");

if (isDemoLoginEnabled && typeof console !== "undefined") {
  console.warn(
    "[EWOS] Demo Login is ENABLED (VITE_ENABLE_DEMO_LOGIN=true). " +
      "This must never be set in a Production build.",
  );
}
