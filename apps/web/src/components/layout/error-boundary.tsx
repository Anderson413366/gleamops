'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200 ease-in-out"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
