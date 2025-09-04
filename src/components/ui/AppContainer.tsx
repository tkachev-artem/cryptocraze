import type React from 'react';

interface AppContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function AppContainer({ children, className = '' }: AppContainerProps) {
  return (
    <div className="h-dvh flex justify-center bg-white">
      <div className="w-full max-w-[100vw] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto relative bg-white shadow-lg">
        <div className={`h-full relative ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
}