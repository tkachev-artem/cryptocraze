import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  maxRetries?: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring service (if configured)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;
    
    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.length !== prevProps.resetKeys.length ||
        resetKeys.some((key, index) => key !== prevProps.resetKeys![index]);
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Example error reporting - in production, you'd send this to your error tracking service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Error report:', errorReport);

    // If error reporting is enabled, send to service
    if (import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true') {
      // Example: sendToErrorService(errorReport);
    }
  };

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));

      // Auto-reset error boundary after a delay if retry fails
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary();
      }, 5000);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-8 h-8 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                We encountered an unexpected error. Please try again.
              </p>
              
              {import.meta.env.DEV && error && (
                <details className="text-left mb-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto text-red-600">
                    {error.message}
                    {error.stack && `\n\n${error.stack}`}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              {retryCount < maxRetries && (
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </Button>
              )}
              
              <Button 
                onClick={this.handleReload}
                className="w-full"
                variant="outline"
              >
                Reload Page
              </Button>
              
              {retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Retry attempt: {retryCount}/{maxRetries}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook version for functional components
export const useErrorBoundary = () => {
  return (error: Error) => {
    throw error;
  };
};