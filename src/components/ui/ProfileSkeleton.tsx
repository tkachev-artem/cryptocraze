import type React from 'react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

/**
 * Base skeleton component with smooth animation
 */
const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  animate = true 
}) => (
  <div 
    className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    aria-hidden="true"
  />
);

/**
 * Profile header skeleton that matches the exact layout
 */
export const ProfileHeaderSkeleton: React.FC = () => (
  <div className="bg-white pb-6">
    <div className="flex flex-col items-center gap-2 px-4">
      {/* Avatar skeleton */}
      <Skeleton className="w-[110px] h-[110px] rounded-[55px]" />
      
      {/* Name skeleton */}
      <Skeleton className="h-6 w-48 mt-2" />
      
      {/* Contacts skeleton */}
      <div className="flex flex-col items-center gap-3 opacity-50 mt-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>

    {/* Wallet summary skeleton */}
    <div className="px-4 pt-4">
      <div className="bg-[#EAF3FF] rounded-full p-1 flex items-center gap-2">
        {/* Money */}
        <div className="bg-white rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[120px]">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Coins */}
        <div className="bg-white rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[100px]">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
        {/* Rewards */}
        <div className="bg-white rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[80px] flex-1">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * Crypto data card skeleton
 */
const CryptoCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-3 h-28">
    <div className="flex items-start justify-between mb-3">
      <div className="flex flex-col justify-start items-start gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-12" />
      </div>
      <Skeleton className="w-[54px] h-[54px] rounded-full" />
    </div>
    <div className="flex items-center justify-end mt-3">
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  </div>
);

/**
 * Crypto data grid skeleton that matches ProfileCryptoData layout
 */
export const CryptoDataSkeleton: React.FC = () => (
  <div className="px-4 py-4">
    <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2">
      <CryptoCardSkeleton />
      <CryptoCardSkeleton />
      <CryptoCardSkeleton />
      <CryptoCardSkeleton />
    </div>
  </div>
);

/**
 * Progressive skeleton that shows different states based on loading progress
 */
interface ProgressiveSkeletonProps {
  stage: 'initial' | 'header-loaded' | 'partial-data' | 'complete';
}

export const ProgressiveSkeleton: React.FC<ProgressiveSkeletonProps> = ({ stage }) => {
  return (
    <div className="min-h-screen bg-[#F1F7FF] pb-[70px] overscroll-y-contain">
      {/* Show header skeleton only in initial stage */}
      {stage === 'initial' && <ProfileHeaderSkeleton />}
      
      {/* Show real content for later stages */}
      {stage !== 'initial' && (
        <div className="bg-white pb-6">
          {/* Header content will be rendered by parent component */}
        </div>
      )}

      {/* Crypto data skeleton - show different variations based on stage */}
      {stage === 'initial' && <CryptoDataSkeleton />}
      
      {stage === 'header-loaded' && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2">
            {/* Show shimmering placeholders */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 h-28 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent animate-shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === 'partial-data' && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2">
            {/* First two cards loaded, others still loading */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 opacity-100">
              {/* Content will be rendered by parent */}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 opacity-100">
              {/* Content will be rendered by parent */}
            </div>
            <CryptoCardSkeleton />
            <CryptoCardSkeleton />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Shimmer effect skeleton for ultra-smooth loading appearance
 */
export const ShimmerSkeleton: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="relative overflow-hidden bg-gray-200 rounded">
    {children}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer" />
  </div>
);

/**
 * Pulse skeleton for simple loading states
 */
export const PulseSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

/**
 * Content-aware skeleton that adapts to the actual content size
 */
interface ContentAwareSkeletonProps {
  width?: string | number;
  height?: string | number;
  shape?: 'rectangle' | 'circle' | 'rounded';
  lines?: number;
  className?: string;
}

export const ContentAwareSkeleton: React.FC<ContentAwareSkeletonProps> = ({
  width,
  height,
  shape = 'rectangle',
  lines = 1,
  className = '',
}) => {
  const shapeClasses = {
    rectangle: 'rounded',
    circle: 'rounded-full',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines === 1) {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${shapeClasses[shape]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 animate-pulse h-4 ${shapeClasses[shape]} ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
          style={i === 0 ? style : undefined}
        />
      ))}
    </div>
  );
};

export default ProfileHeaderSkeleton;