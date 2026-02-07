import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { Size, ColorScheme } from '../types';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: Size;
  colorScheme?: ColorScheme;
  isDisabled?: boolean;
  label?: string;
  description?: string;
}

const sizeStyles: Record<Size, { track: string; thumb: string; translate: string; label: string }> = {
  xs: { track: 'h-4 w-7', thumb: 'h-3 w-3', translate: 'translate-x-3', label: 'text-xs' },
  sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4', label: 'text-sm' },
  md: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5', label: 'text-sm' },
  lg: { track: 'h-7 w-14', thumb: 'h-6 w-6', translate: 'translate-x-7', label: 'text-base' },
  xl: { track: 'h-8 w-16', thumb: 'h-7 w-7', translate: 'translate-x-8', label: 'text-lg' },
};

const colorStyles: Record<ColorScheme, string> = {
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  danger: 'bg-danger-600',
  gray: 'bg-gray-600',
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      size = 'md',
      colorScheme = 'primary',
      isDisabled = false,
      label,
      description,
      className,
      disabled,
      id,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const isSwitchDisabled = isDisabled || disabled;
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

    const switchElement = (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isSwitchDisabled}
        onClick={() => {
          if (onChange) {
            const syntheticEvent = {
              target: { checked: !checked },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
          }
        }}
        className={clsx(
          'relative inline-flex items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? colorStyles[colorScheme] : 'bg-gray-200',
          sizeStyles[size].track,
          className
        )}
      >
        <span
          className={clsx(
            'inline-block rounded-full bg-white shadow transform transition-transform',
            checked ? sizeStyles[size].translate : 'translate-x-0.5',
            sizeStyles[size].thumb
          )}
        />
        <input
          ref={ref}
          id={switchId}
          type="checkbox"
          checked={checked}
          disabled={isSwitchDisabled}
          onChange={onChange}
          className="sr-only"
          {...props}
        />
      </button>
    );

    if (!label) {
      return switchElement;
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <label
            htmlFor={switchId}
            className={clsx(
              'font-medium text-gray-700',
              isSwitchDisabled && 'text-gray-400 cursor-not-allowed',
              sizeStyles[size].label
            )}
          >
            {label}
          </label>
          {description && (
            <p className="text-gray-500 text-sm mt-0.5">{description}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">{switchElement}</div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
