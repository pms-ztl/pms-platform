import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Size } from '../types';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: Size;
  isInvalid?: boolean;
  isDisabled?: boolean;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
}

const sizeStyles: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
  xl: 'px-5 py-3 text-lg',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      isInvalid = false,
      isDisabled = false,
      leftElement,
      rightElement,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isInputDisabled = isDisabled || disabled;

    const inputElement = (
      <input
        ref={ref}
        disabled={isInputDisabled}
        className={clsx(
          'block w-full rounded-lg border shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          'placeholder:text-gray-400',
          isInvalid
            ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
          sizeStyles[size],
          leftElement && 'pl-10',
          rightElement && 'pr-10',
          className
        )}
        {...props}
      />
    );

    if (leftElement || rightElement) {
      return (
        <div className="relative">
          {leftElement && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {leftElement}
            </div>
          )}
          {inputElement}
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
              {rightElement}
            </div>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';
