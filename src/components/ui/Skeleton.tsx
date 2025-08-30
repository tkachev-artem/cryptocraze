import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div 
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )} 
      {...props} 
    />
  );
};

// Specific skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className 
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton 
        key={i}
        className={cn(
          "h-4",
          i === lines - 1 ? "w-3/4" : "w-full" // Last line shorter
        )} 
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-lg border bg-card p-4", className)}>
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} className="h-6 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-lg border bg-card p-4", className)}>
    {/* Chart header */}
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-20" />
    </div>
    {/* Chart area */}
    <Skeleton className="h-64 w-full rounded" />
    {/* Chart legend */}
    <div className="flex space-x-4 mt-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: items }, (_, i) => (
      <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    ))}
  </div>
);

export const SkeletonProfile: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-lg border bg-card p-6", className)}>
    {/* Profile header */}
    <div className="flex items-center space-x-4 mb-6">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
    
    {/* Profile stats */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      ))}
    </div>
    
    {/* Profile actions */}
    <div className="flex space-x-3">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 flex-1" />
    </div>
  </div>
);

export const SkeletonTaskCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-xl border bg-card p-4", className)}>
    {/* Task header */}
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    
    {/* Task content */}
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4 mb-4" />
    
    {/* Progress bar */}
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
    
    {/* Task reward */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  </div>
);

export const SkeletonCryptoCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("rounded-lg border bg-card p-4", className)}>
    {/* Crypto header */}
    <div className="flex items-center space-x-3 mb-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-20 mb-1" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
    
    {/* Price info */}
    <div className="space-y-2 mb-4">
      <Skeleton className="h-6 w-24" />
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
    
    {/* Mini chart */}
    <Skeleton className="h-16 w-full rounded" />
  </div>
);

// Loading state wrapper
export const LoadingState: React.FC<{ 
  isLoading: boolean; 
  skeleton: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
}> = ({ isLoading, skeleton, children, className }) => {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>;
  }
  return <>{children}</>;
};