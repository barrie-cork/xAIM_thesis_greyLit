import * as React from 'react';
import { cn } from '../../utils/cn';
import { Label } from '../Label/Label';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea: React.FC<TextareaProps> = ({
  value,
  onChange,
  label,
  helperText,
  error,
  required,
  className,
  id,
  disabled,
  maxLength,
  showCharacterCount = false,
  resize = 'vertical',
  rows = 3,
  placeholder,
  ...props
}) => {
  const textareaId = id || React.useId();
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;
  const counterId = `${textareaId}-counter`;

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(event.target.value);
  };

  const characterCount = value?.length || 0;
  const showCount = showCharacterCount || maxLength;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label htmlFor={textareaId} error={!!error} required={required}>
          {label}
        </Label>
      )}
      <div className="relative">
        <textarea
          id={textareaId}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!error || isOverLimit}
          aria-describedby={cn(
            error ? errorId : undefined,
            helperText ? helperId : undefined,
            showCount ? counterId : undefined
          )}
          className={cn(
            'w-full px-3 py-2 rounded-md border text-gray-900 placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
            error || isOverLimit
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300',
            {
              'resize-none': resize === 'none',
              'resize-y': resize === 'vertical',
              'resize-x': resize === 'horizontal',
              'resize': resize === 'both',
            }
          )}
          {...props}
        />
      </div>
      <div className="mt-1 flex justify-between">
        <div>
          {error && (
            <p id={errorId} className="text-sm text-red-500">
              {error}
            </p>
          )}
          {helperText && !error && (
            <p id={helperId} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
        {showCount && (
          <p
            id={counterId}
            className={cn(
              'text-sm',
              isOverLimit ? 'text-red-500' : 'text-gray-500'
            )}
          >
            {characterCount}
            {maxLength && ` / ${maxLength}`}
          </p>
        )}
      </div>
    </div>
  );
}; 