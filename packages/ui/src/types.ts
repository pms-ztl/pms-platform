import type { ReactNode } from 'react';

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Variant = 'solid' | 'outline' | 'ghost' | 'link';

export type ColorScheme =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gray';

export type Intent = 'info' | 'success' | 'warning' | 'danger';

export interface IconProps {
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}
