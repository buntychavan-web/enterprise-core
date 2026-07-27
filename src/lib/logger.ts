/**
 * Client-side logging gate: `logger.error` no-ops in a production build so a
 * route or component error's raw message/stack never lands in an end user's
 * browser console. Use `reportLovableError` (lib/lovable-error-reporting.ts)
 * for actual production error tracking — this is for developer-facing
 * console output only.
 */
export const logger = {
  error(...args: unknown[]) {
    if (import.meta.env.DEV) {
      console.error(...args);
    }
  },
};
