/**
 * Feature flags: build-time toggles read from VITE_* env vars. Add a new key
 * here and to FLAGS rather than reading import.meta.env ad hoc elsewhere, so
 * every flag in the app is discoverable in one place.
 */
type FeatureFlagKey = "demoLogin";

const FLAGS: Record<FeatureFlagKey, boolean> = {
  demoLogin: import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true",
};

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FLAGS[flag];
}

/** Hook form for use inside components — same static value today, but keeps call sites ready if a flag source ever becomes runtime-dynamic. */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return FLAGS[flag];
}
