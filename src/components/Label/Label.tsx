import * as React from 'react';
import { cn } from '../../utils/cn';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  className,
  required = false,
  error = false,
  ...props
}) => {
  return (
    <label
      className={cn(
        'block text-sm font-medium mb-1',
        error ? 'text-red-500' : 'text-gray-700',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}; 