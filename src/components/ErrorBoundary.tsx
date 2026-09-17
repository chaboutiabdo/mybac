import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a single bad component does not white-screen the
 * whole app. There was no boundary anywhere before this, which also meant a
 * failed lazy-chunk fetch after a deploy left users on a blank page.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    // A stale bundle is the most likely cause after a deploy, and a reload
    // fixes exactly that — so offer it first.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-2xl font-bold">حدث خطأ غير متوقع</h1>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
            جرّب إعادة تحميل الصفحة. إذا تكرّر الخطأ، تواصل معنا.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            <RefreshCw className="me-2 h-4 w-4" aria-hidden />
            إعادة تحميل
          </Button>
          {import.meta.env.DEV && (
            <pre className="mt-6 overflow-auto rounded-md border border-border bg-surface-deep p-4 text-start text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
