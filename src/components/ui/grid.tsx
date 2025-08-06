import type React from 'react';

type GridProps = {
  children: React.ReactNode;
  className?: string;
};

export function Grid({ children, className = '' }: GridProps) {
  return (
    <div className={`min-h-screen flex justify-center ${className}`}>
      <div className={`max-w-md w-full bg-white rounded-3xl text-center ${className}`}>
        {children}
      </div>
    </div>
  );
} 