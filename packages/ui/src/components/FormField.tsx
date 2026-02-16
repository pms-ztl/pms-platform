import clsx from 'clsx';
import type { BaseProps } from '../types';

interface FormFieldProps extends BaseProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

interface FormLabelProps extends BaseProps {
  htmlFor?: string;
  required?: boolean;
}

interface FormErrorProps extends BaseProps {}

interface FormHelperTextProps extends BaseProps {}

export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <FormLabel htmlFor={htmlFor} required={required}>
          {label}
        </FormLabel>
      )}
      {children}
      {error && <FormError>{error}</FormError>}
      {!error && helperText && <FormHelperText>{helperText}</FormHelperText>}
    </div>
  );
}

export function FormLabel({
  htmlFor,
  required,
  className,
  children,
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx('block text-sm font-medium text-gray-700', className)}
    >
      {children}
      {required && <span className="text-danger-500 ml-1">*</span>}
    </label>
  );
}

export function FormError({ className, children }: FormErrorProps) {
  return (
    <p className={clsx('text-sm text-danger-600', className)}>{children}</p>
  );
}

export function FormHelperText({ className, children }: FormHelperTextProps) {
  return (
    <p className={clsx('text-sm text-gray-500', className)}>{children}</p>
  );
}
