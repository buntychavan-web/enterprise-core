import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** Shown in the fallback message, e.g. "the Payslips screen". */
  section?: string;
};

type State = { error: Error | null };

/**
 * Contains a render crash to the subtree it wraps instead of blanking the
 * whole app. The root route's own errorComponent (src/routes/__root.tsx)
 * still catches anything that escapes here or throws during routing/loaders.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(error, info.componentStack);
    reportLovableError(error, {
      boundary: "component_error_boundary",
      section: this.props.section,
    });
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          {this.props.section ? `${this.props.section} didn't load.` : "This section didn't load."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong rendering this part of the page. The rest of EWOS is unaffected.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}
