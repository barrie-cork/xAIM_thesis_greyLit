import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
}

const Chip = forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-blue-100 text-blue-800',
      secondary: 'bg-gray-200 text-gray-800',
      outline: 'border border-gray-300 bg-transparent'
    };

    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Chip.displayName = 'Chip';

export { Chip }; 