/**
 * ErrorBoundary — catches React render errors and shows fallback UI.
 */
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="p-6 bg-red-50 border border-red-200 rounded-lg m-4"
          data-testid="error-boundary"
        >
          <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-600" data-testid="error-message">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            className="mt-3 px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            onClick={() => this.setState({ hasError: false, error: null })}
            data-testid="error-retry"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
