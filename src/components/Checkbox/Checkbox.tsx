import * as React from 'react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked = false,
  onChange,
  helperText,
  error,
  indeterminate = false,
  className,
  id,
  disabled,
  required,
  ...props
}) => {
  const checkboxId = id || React.useId();
  const errorId = `${checkboxId}-error`;
  const helperId = `${checkboxId}-helper`;

  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.checked);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={checkboxRef}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={cn(
              error ? errorId : undefined,
              helperText ? helperId : undefined
            )}
            className={cn(
              'h-4 w-4 rounded border',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 text-red-600'
                : 'border-gray-300 text-blue-600',
              'transition-colors duration-200'
            )}
            {...props}
          />
        </div>
        <div className="ml-3 text-sm">
          <label
            htmlFor={checkboxId}
            className={cn(
              'font-medium',
              disabled ? 'text-gray-400' : 'text-gray-900',
              error ? 'text-red-500' : ''
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {helperText && !error && (
            <p id={helperId} className="text-gray-500">
              {helperText}
            </p>
          )}
          {error && (
            <p id={errorId} className="text-red-500">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 