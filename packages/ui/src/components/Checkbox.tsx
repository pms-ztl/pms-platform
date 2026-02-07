import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { Size, ColorScheme } from '../types';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: Size;
  colorScheme?: ColorScheme;
  isInvalid?: boolean;
  isDisabled?: boolean;
  label?: string;
  description?: string;
}

const sizeStyles: Record<Size, { checkbox: string; label: string }> = {
  xs: { checkbox: 'h-3 w-3', label: 'text-xs' },
  sm: { checkbox: 'h-4 w-4', label: 'text-sm' },
  md: { checkbox: 'h-4 w-4', label: 'text-sm' },
  lg: { checkbox: 'h-5 w-5', label: 'text-base' },
  xl: { checkbox: 'h-6 w-6', label: 'text-lg' },
};

const colorStyles: Record<ColorScheme, string> = {
  primary: 'text-primary-600 focus:ring-primary-500',
  secondary: 'text-secondary-600 focus:ring-secondary-500',
  success: 'text-success-600 focus:ring-success-500',
  warning: 'text-warning-600 focus:ring-warning-500',
  danger: 'text-danger-600 focus:ring-danger-500',
  gray: 'text-gray-600 focus:ring-gray-500',
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size = 'md',
      colorScheme = 'primary',
      isInvalid = false,
      isDisabled = false,
      label,
      description,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const isCheckboxDisabled = isDisabled || disabled;
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    const checkbox = (
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        disabled={isCheckboxDisabled}
        className={clsx(
          'rounded border-gray-300 transition-colors',
          'focus:ring-2 focus:ring-offset-2',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          isInvalid && 'border-danger-300',
          sizeStyles[size].checkbox,
          colorStyles[colorScheme],
          className
        )}
        {...props}
      />
    );

    if (!label) {
      return checkbox;
    }

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">{checkbox}</div>
        <div className="ml-3">
          <label
            htmlFor={checkboxId}
            className={clsx(
              'font-medium text-gray-700',
              isCheckboxDisabled && 'text-gray-400 cursor-not-allowed',
              sizeStyles[size].label
            )}
          >
            {label}
          </label>
          {description && (
            <p className="text-gray-500 text-sm mt-0.5">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
