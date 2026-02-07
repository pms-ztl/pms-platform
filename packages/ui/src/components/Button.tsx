import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Size, Variant, ColorScheme } from '../types';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  colorScheme?: ColorScheme;
  size?: Size;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
  xl: 'px-6 py-3 text-lg',
};

const variantStyles: Record<Variant, Record<ColorScheme, string>> = {
  solid: {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
    gray: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  },
  outline: {
    primary: 'border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    secondary: 'border-secondary-600 text-secondary-600 hover:bg-secondary-50 focus:ring-secondary-500',
    success: 'border-success-600 text-success-600 hover:bg-success-50 focus:ring-success-500',
    warning: 'border-warning-600 text-warning-600 hover:bg-warning-50 focus:ring-warning-500',
    danger: 'border-danger-600 text-danger-600 hover:bg-danger-50 focus:ring-danger-500',
    gray: 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  },
  ghost: {
    primary: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    secondary: 'text-secondary-600 hover:bg-secondary-50 focus:ring-secondary-500',
    success: 'text-success-600 hover:bg-success-50 focus:ring-success-500',
    warning: 'text-warning-600 hover:bg-warning-50 focus:ring-warning-500',
    danger: 'text-danger-600 hover:bg-danger-50 focus:ring-danger-500',
    gray: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  },
  link: {
    primary: 'text-primary-600 hover:text-primary-700 hover:underline',
    secondary: 'text-secondary-600 hover:text-secondary-700 hover:underline',
    success: 'text-success-600 hover:text-success-700 hover:underline',
    warning: 'text-warning-600 hover:text-warning-700 hover:underline',
    danger: 'text-danger-600 hover:text-danger-700 hover:underline',
    gray: 'text-gray-600 hover:text-gray-700 hover:underline',
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'solid',
      colorScheme = 'primary',
      size = 'md',
      isLoading = false,
      isDisabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isButtonDisabled = isDisabled || disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isButtonDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'outline' && 'border',
          sizeStyles[size],
          variantStyles[variant][colorScheme],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && (
          <Spinner
            size="sm"
            className={clsx(
              'mr-2',
              variant === 'solid' ? 'text-white' : `text-${colorScheme}-600`
            )}
          />
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
