import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from './ui/button';
import { useTranslation } from '@/lib/i18n';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  routeName?: string;
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({ 
  children, 
  routeName 
}) => {
  const { t } = useTranslation();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`Route error in ${routeName || 'unknown route'}:`, error, errorInfo);
  };

  const routeErrorFallback = (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F7FF] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-10 h-10 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {t('error.route.title') || 'Page Error'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {routeName 
              ? (t('error.route.description.specific') || `There was an error loading the ${routeName} page.`)
              : (t('error.route.description.generic') || 'There was an error loading this page.')
            }
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {t('error.route.reload') || 'Reload Page'}
          </Button>
          
          <Button 
            onClick={() => window.history.back()}
            className="w-full"
            variant="outline"
          >
            {t('error.route.goBack') || 'Go Back'}
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
            variant="ghost"
          >
            {t('error.route.home') || 'Go to Home'}
          </Button>
        </div>
        
        <p className="mt-6 text-xs text-gray-500">
          {t('error.route.help') || 'If this problem persists, please contact support.'}
        </p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={routeErrorFallback}
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  );
};