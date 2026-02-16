import { forwardRef, type InputHTMLAttributes, createContext, useContext } from 'react';
import clsx from 'clsx';
import type { Size, ColorScheme, BaseProps } from '../types';

interface RadioContextValue {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  size?: Size;
  colorScheme?: ColorScheme;
  isDisabled?: boolean;
}

const RadioContext = createContext<RadioContextValue>({});

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: Size;
  colorScheme?: ColorScheme;
  isDisabled?: boolean;
  label?: string;
  description?: string;
}

export interface RadioGroupProps extends BaseProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  size?: Size;
  colorScheme?: ColorScheme;
  isDisabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

const sizeStyles: Record<Size, { radio: string; label: string }> = {
  xs: { radio: 'h-3 w-3', label: 'text-xs' },
  sm: { radio: 'h-4 w-4', label: 'text-sm' },
  md: { radio: 'h-4 w-4', label: 'text-sm' },
  lg: { radio: 'h-5 w-5', label: 'text-base' },
  xl: { radio: 'h-6 w-6', label: 'text-lg' },
};

const colorStyles: Record<ColorScheme, string> = {
  primary: 'text-primary-600 focus:ring-primary-500',
  secondary: 'text-secondary-600 focus:ring-secondary-500',
  success: 'text-success-600 focus:ring-success-500',
  warning: 'text-warning-600 focus:ring-warning-500',
  danger: 'text-danger-600 focus:ring-danger-500',
  gray: 'text-gray-600 focus:ring-gray-500',
};

export const RadioGroup = ({
  name,
  value,
  onChange,
  size = 'md',
  colorScheme = 'primary',
  isDisabled = false,
  orientation = 'vertical',
  className,
  children,
}: RadioGroupProps) => {
  return (
    <RadioContext.Provider value={{ name, value, onChange, size, colorScheme, isDisabled }}>
      <div
        role="radiogroup"
        className={clsx(
          'flex',
          orientation === 'vertical' ? 'flex-col space-y-3' : 'flex-row space-x-6',
          className
        )}
      >
        {children}
      </div>
    </RadioContext.Provider>
  );
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      size: sizeProp,
      colorScheme: colorSchemeProp,
      isDisabled: isDisabledProp,
      label,
      description,
      className,
      disabled,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const context = useContext(RadioContext);
    const size = sizeProp || context.size || 'md';
    const colorScheme = colorSchemeProp || context.colorScheme || 'primary';
    const isRadioDisabled = isDisabledProp || disabled || context.isDisabled;
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    const name = context.name || props.name;
    const isChecked = context.value !== undefined ? context.value === value : undefined;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (context.onChange && value) {
        context.onChange(String(value));
      }
      if (onChange) {
        onChange(e);
      }
    };

    const radio = (
      <input
        ref={ref}
        id={radioId}
        type="radio"
        name={name}
        value={value}
        checked={isChecked}
        disabled={isRadioDisabled}
        onChange={handleChange}
        className={clsx(
          'border-gray-300 transition-colors',
          'focus:ring-2 focus:ring-offset-2',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          sizeStyles[size].radio,
          colorStyles[colorScheme],
          className
        )}
        {...props}
      />
    );

    if (!label) {
      return radio;
    }

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">{radio}</div>
        <div className="ml-3">
          <label
            htmlFor={radioId}
            className={clsx(
              'font-medium text-gray-700',
              isRadioDisabled && 'text-gray-400 cursor-not-allowed',
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

Radio.displayName = 'Radio';
RadioGroup.displayName = 'RadioGroup';
