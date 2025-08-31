import type React from 'react';

type GridProps = {
  children: React.ReactNode;
  className?: string;
};

export function Grid({ children, className = '' }: GridProps) {
  return (
    <div className={`min-h-dvh flex justify-center bg-[#0C54EA]`}>
      <div className={`max-w-md w-full bg-white text-center ${className}`}>
        {children}
      </div>
    </div>
  );
} 