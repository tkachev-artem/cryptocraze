import type React from 'react';

type CardProps = {
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div {...rest} className={`rounded-lg border bg-white text-gray-950 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: CardProps) {
  return (
    <div {...rest} className={`flex flex-col space-y-1.5 p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...rest }: CardProps) {
  return (
    <h3 {...rest} className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...rest }: CardProps) {
  return (
    <div {...rest} className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
}