import type { ReactNode } from "react";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ewos/EmptyState";
import { ApiError } from "@/lib/api-client";

/**
 * Uniform loading / error / permission rendering for every API-backed panel.
 * Keeps error semantics consistent: 403 -> access notice, 404 -> endpoint not
 * reachable, everything else -> retryable error.
 */
export function QueryState({
  isLoading,
  error,
  onRetry,
  label,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  label: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div
        className="grid place-items-center p-12 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <span className="sr-only">Loading {label}…</span>
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.isForbidden) {
      return (
        <EmptyState
          icon={Lock}
          title="Access restricted"
          description={`Your role does not include permission to view ${label}.`}
        />
      );
    }
    if (error instanceof ApiError && error.isNotFound) {
      return (
        <EmptyState
          title="Not available"
          description={`The ${label} endpoint is not reachable right now. This screen will populate as soon as the service responds.`}
        />
      );
    }
    return (
      <div className="p-8 text-center" role="alert">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden />
        <p className="mt-3 text-sm text-destructive">
          {error instanceof Error ? error.message : `Failed to load ${label}.`}
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
