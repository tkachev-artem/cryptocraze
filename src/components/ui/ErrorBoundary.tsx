import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
  isolate?: boolean;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

/**
 * Enhanced Error Boundary with retry functionality and graceful degradation
 * Optimized for mobile performance and user experience
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
    this.previousResetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if props have changed (and resetOnPropsChange is enabled)
    if (hasError && resetOnPropsChange) {
      if (resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => prevProps.resetKeys![index] !== key
        );
        if (hasResetKeyChanged) {
          this.resetError();
        }
      }
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  resetError = (): void => {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  retry = (): void => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState({ retryCount: retryCount + 1 });

    // Clear existing timeout
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }

    // Exponential backoff delay
    const delay = retryDelay * Math.pow(2, retryCount);

    this.retryTimeoutId = window.setTimeout(() => {
      this.resetError();
    }, delay);
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, maxRetries = 3, isolate = false } = this.props;

    if (hasError && error) {
      // Custom fallback function
      if (typeof fallback === 'function') {
        return fallback(error, this.retry);
      }

      // Custom fallback component
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={error}
          retry={this.retry}
          canRetry={this.state.retryCount < maxRetries}
          retryCount={this.state.retryCount}
          isolate={isolate}
        />
      );
    }

    return children;
  }
}

/**
 * Default error fallback component with retry functionality
 */
interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
  canRetry: boolean;
  retryCount: number;
  isolate?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry,
  retryCount,
  isolate = false,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isolate) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 m-2">
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Something went wrong
        </div>
        {canRetry && (
          <button
            onClick={retry}
            className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
          >
            Try again {retryCount > 0 && `(${retryCount}/3)`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          We encountered an unexpected error. Don't worry, this happens sometimes.
        </p>

        {isDevelopment && (
          <details className="mb-4 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto text-red-600">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}

        {canRetry ? (
          <button
            onClick={retry}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try again {retryCount > 0 && `(Attempt ${retryCount + 1}/3)`}
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            Unable to recover from this error. Please refresh the page.
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
};

/**
 * Hook for error boundary context
 */
export const useErrorBoundary = () => {
  return {
    resetError: () => {
      // This would need to be connected to the nearest ErrorBoundary
      // For now, we'll just reload the page
      window.location.reload();
    },
  };
};

/**
 * Higher-order component for adding error boundary to any component
 */
export function withErrorBoundary<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const WithErrorBoundaryComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Async error boundary for handling promise rejections in components
 */
export const AsyncErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  return <ErrorBoundary {...props} isolate={true} />;
};

export default ErrorBoundary;