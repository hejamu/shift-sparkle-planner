import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-lg border-destructive/20">
            <CardHeader className="border-b bg-destructive/5">
              <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-muted-foreground">
                An error occurred while rendering this page. This is usually caused by a code issue.
              </p>

              {this.state.error && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Message:
                  </p>
                  <pre className="bg-muted/50 border border-border rounded-md p-3 text-sm overflow-auto max-h-32 text-destructive">
                    {this.state.error.message}
                  </pre>
                </div>
              )}

              {this.state.errorInfo && (
                <details className="group">
                  <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Show technical details (for developers)
                  </summary>
                  <pre className="mt-2 bg-muted/50 border border-border rounded-md p-3 text-xs overflow-auto max-h-64 text-muted-foreground">
                    {this.state.error?.stack}
                    {"\n\nComponent Stack:"}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
